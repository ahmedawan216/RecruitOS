-- RecruitOS Phase 2E: atomic, human-approved candidate status actions.
-- The browser never calls these functions directly. Execution is restricted to
-- service_role so authenticated clients cannot bypass the server approval layer.

create or replace function public.apply_recruitos_candidate_status_proposal(
  p_user_id uuid,
  p_execution_id uuid,
  p_proposal_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_work_state jsonb;
  v_job_id uuid;
  v_item jsonb;
  v_current_status text;
  v_candidate_id uuid;
  v_expected_status text;
  v_proposed_status text;
  v_conflicts jsonb := '[]'::jsonb;
  v_applied_candidates jsonb := '[]'::jsonb;
  v_applied_at timestamptz := now();
  v_action_result jsonb;
begin
  select result, coalesce(work_state, '{}'::jsonb), resolved_job_id
    into v_result, v_work_state, v_job_id
  from public.recruitos_command_executions
  where id = p_execution_id and user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'PROPOSAL_NOT_FOUND');
  end if;

  if v_result->>'kind' = 'candidate_status_action_result'
     and v_result->>'proposalId' = p_proposal_id::text then
    return jsonb_build_object('ok', true, 'duplicate', true, 'result', v_result);
  end if;

  if v_result->>'kind' <> 'candidate_status_proposal'
     or v_result->>'proposalId' <> p_proposal_id::text
     or v_result->>'proposalStatus' not in ('pending', 'stale') then
    return jsonb_build_object('ok', false, 'code', 'PROPOSAL_NOT_PENDING');
  end if;

  if v_job_id is null or not exists (
    select 1 from public.jobs where id = v_job_id and user_id = p_user_id
  ) then
    return jsonb_build_object('ok', false, 'code', 'STALE_JOB');
  end if;

  -- Lock and validate every candidate/job match before performing any mutation.
  for v_item in select value from jsonb_array_elements(v_result->'candidates')
  loop
    v_candidate_id := (v_item->>'candidateId')::uuid;
    v_expected_status := v_item->>'expectedStatus';
    v_proposed_status := v_item->>'proposedStatus';

    if v_proposed_status <> 'interview'
       or v_expected_status not in ('new', 'reviewing', 'shortlisted') then
      v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
        'candidateId', v_candidate_id,
        'currentStatus', null,
        'reason', 'The proposed transition is no longer allowed.'
      ));
      continue;
    end if;

    select recruiter_status
      into v_current_status
    from public.candidate_job_matches
    where user_id = p_user_id
      and job_id = v_job_id
      and candidate_id = v_candidate_id
    for update;

    if not found then
      v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
        'candidateId', v_candidate_id,
        'currentStatus', null,
        'reason', 'The candidate is no longer available in this job.'
      ));
    elsif v_current_status <> v_expected_status then
      v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
        'candidateId', v_candidate_id,
        'currentStatus', v_current_status,
        'reason', 'Candidate status changed after this proposal was prepared.'
      ));
    end if;
  end loop;

  if jsonb_array_length(v_conflicts) > 0 then
    return jsonb_build_object('ok', false, 'code', 'STALE_PROPOSAL', 'conflicts', v_conflicts);
  end if;

  -- All-or-none mutation: this function is one database transaction.
  for v_item in select value from jsonb_array_elements(v_result->'candidates')
  loop
    v_candidate_id := (v_item->>'candidateId')::uuid;
    v_expected_status := v_item->>'expectedStatus';

    update public.candidate_job_matches
    set recruiter_status = 'interview', updated_at = v_applied_at
    where user_id = p_user_id
      and job_id = v_job_id
      and candidate_id = v_candidate_id
      and recruiter_status = v_expected_status;

    if not found then
      raise exception 'PHASE2E_ATOMIC_UPDATE_CONFLICT';
    end if;

    insert into public.candidate_activity (user_id, candidate_id, job_id, type, metadata)
    values (
      p_user_id,
      v_candidate_id,
      v_job_id,
      'status_changed',
      jsonb_build_object(
        'previous_status', v_expected_status,
        'status', 'interview',
        'new_status', 'interview',
        'source', 'recruitos_human_reviewed_action',
        'proposal_id', p_proposal_id,
        'execution_id', p_execution_id,
        'actor_user_id', p_user_id
      )
    );

    v_applied_candidates := v_applied_candidates || jsonb_build_array(jsonb_build_object(
      'candidateId', v_candidate_id,
      'name', v_item->'name',
      'email', v_item->'email',
      'candidateHref', v_item->'candidateHref',
      'previousStatus', v_expected_status,
      'newStatus', 'interview'
    ));
  end loop;

  v_action_result := jsonb_build_object(
    'kind', 'candidate_status_action_result',
    'job', v_result->'job',
    'proposalId', p_proposal_id,
    'appliedAt', v_applied_at,
    'appliedCount', jsonb_array_length(v_applied_candidates),
    'candidates', v_applied_candidates
  );

  update public.recruitos_command_executions
  set result = v_action_result,
      status = 'completed',
      stage = 'action_applied',
      work_state = jsonb_set(
        v_work_state,
        '{phase2eProposal}',
        jsonb_build_object('proposalId', p_proposal_id, 'status', 'applied', 'appliedAt', v_applied_at),
        true
      ),
      error_code = null,
      error_message = null,
      updated_at = v_applied_at
  where id = p_execution_id and user_id = p_user_id;

  return jsonb_build_object('ok', true, 'duplicate', false, 'result', v_action_result);
end;
$$;

create or replace function public.cancel_recruitos_candidate_status_proposal(
  p_user_id uuid,
  p_execution_id uuid,
  p_proposal_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_work_state jsonb;
  v_prior_result jsonb;
  v_proposal_state jsonb;
  v_cancelled_at timestamptz := now();
begin
  select result, coalesce(work_state, '{}'::jsonb)
    into v_result, v_work_state
  from public.recruitos_command_executions
  where id = p_execution_id and user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'PROPOSAL_NOT_FOUND');
  end if;

  v_proposal_state := v_work_state->'phase2eProposal';
  if v_proposal_state->>'proposalId' = p_proposal_id::text
     and v_proposal_state->>'status' = 'cancelled' then
    return jsonb_build_object('ok', true, 'duplicate', true, 'result', v_result);
  end if;

  if v_result->>'kind' = 'candidate_status_action_result'
     and v_result->>'proposalId' = p_proposal_id::text then
    return jsonb_build_object('ok', false, 'code', 'ALREADY_APPLIED');
  end if;

  if v_result->>'kind' <> 'candidate_status_proposal'
     or v_result->>'proposalId' <> p_proposal_id::text then
    return jsonb_build_object('ok', false, 'code', 'PROPOSAL_NOT_PENDING');
  end if;

  v_prior_result := v_work_state->'phase2ePriorResult';
  if v_prior_result is null then
    return jsonb_build_object('ok', false, 'code', 'PROPOSAL_RECOVERY_MISSING');
  end if;

  update public.recruitos_command_executions
  set result = v_prior_result,
      status = 'completed',
      stage = 'action_cancelled',
      work_state = jsonb_set(
        v_work_state,
        '{phase2eProposal}',
        jsonb_build_object('proposalId', p_proposal_id, 'status', 'cancelled', 'cancelledAt', v_cancelled_at),
        true
      ),
      error_code = null,
      error_message = null,
      updated_at = v_cancelled_at
  where id = p_execution_id and user_id = p_user_id;

  return jsonb_build_object('ok', true, 'duplicate', false, 'result', v_prior_result);
end;
$$;

revoke all on function public.apply_recruitos_candidate_status_proposal(uuid, uuid, uuid) from public;
revoke all on function public.apply_recruitos_candidate_status_proposal(uuid, uuid, uuid) from anon;
revoke all on function public.apply_recruitos_candidate_status_proposal(uuid, uuid, uuid) from authenticated;
grant execute on function public.apply_recruitos_candidate_status_proposal(uuid, uuid, uuid) to service_role;

revoke all on function public.cancel_recruitos_candidate_status_proposal(uuid, uuid, uuid) from public;
revoke all on function public.cancel_recruitos_candidate_status_proposal(uuid, uuid, uuid) from anon;
revoke all on function public.cancel_recruitos_candidate_status_proposal(uuid, uuid, uuid) from authenticated;
grant execute on function public.cancel_recruitos_candidate_status_proposal(uuid, uuid, uuid) to service_role;
