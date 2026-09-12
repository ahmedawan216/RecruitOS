-- RecruitOS Phase 3D: server-authoritative capacity limits.
-- Adds only the minimal database primitives needed to make active-job and
-- resume-analysis enforcement concurrency-safe. Paddle billing state is not
-- modified by this migration.

create table public.recruitos_resume_analysis_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Keep immutable identifiers without cascading foreign keys. Deleting a
  -- resume or job must not erase already-consumed usage inside its window.
  resume_id uuid not null,
  job_id uuid not null,
  period text not null,
  window_start timestamptz not null,
  window_end timestamptz not null,
  accepted_at timestamptz not null default now(),
  constraint recruitos_resume_analysis_usage_period_check
    check (period in ('day', 'month')),
  constraint recruitos_resume_analysis_usage_window_check
    check (window_end > window_start),
  constraint recruitos_resume_analysis_usage_retry_unique
    unique (user_id, resume_id, job_id, window_start)
);

create index recruitos_resume_analysis_usage_user_window_idx
  on public.recruitos_resume_analysis_usage(user_id, accepted_at);

alter table public.recruitos_resume_analysis_usage enable row level security;

-- This ledger is an internal server-side enforcement primitive. Browser roles
-- do not need direct read or write access.
revoke all on table public.recruitos_resume_analysis_usage from public, anon, authenticated;
grant all on table public.recruitos_resume_analysis_usage to service_role;

create or replace function public.recruitos_create_job_with_limit(
  p_user_id uuid,
  p_title text,
  p_description text,
  p_active_job_limit integer
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_active_jobs integer;
  v_job_id uuid;
begin
  if p_active_job_limit < 1 then
    raise exception 'ACTIVE_JOB_LIMIT_INVALID';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('recruitos-usage:' || p_user_id::text, 0));

  select count(*)::integer
  into v_active_jobs
  from public.jobs
  where user_id = p_user_id
    and lifecycle_status = 'open';

  if v_active_jobs >= p_active_job_limit then
    return jsonb_build_object(
      'allowed', false,
      'usage', v_active_jobs
    );
  end if;

  insert into public.jobs (
    user_id,
    title,
    description,
    status,
    lifecycle_status
  )
  values (
    p_user_id,
    p_title,
    p_description,
    'open',
    'open'
  )
  returning id into v_job_id;

  return jsonb_build_object(
    'allowed', true,
    'jobId', v_job_id
  );
end;
$$;

create or replace function public.recruitos_open_job_with_limit(
  p_user_id uuid,
  p_job_id uuid,
  p_active_job_limit integer
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current_status text;
  v_active_jobs integer;
begin
  if p_active_job_limit < 1 then
    raise exception 'ACTIVE_JOB_LIMIT_INVALID';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('recruitos-usage:' || p_user_id::text, 0));

  select lifecycle_status
  into v_current_status
  from public.jobs
  where id = p_job_id
    and user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('allowed', true, 'found', false);
  end if;

  if v_current_status = 'open' then
    return jsonb_build_object('allowed', true, 'found', true);
  end if;

  select count(*)::integer
  into v_active_jobs
  from public.jobs
  where user_id = p_user_id
    and lifecycle_status = 'open';

  if v_active_jobs >= p_active_job_limit then
    return jsonb_build_object(
      'allowed', false,
      'found', true,
      'usage', v_active_jobs
    );
  end if;

  update public.jobs
  set lifecycle_status = 'open',
      status = 'open'
  where id = p_job_id
    and user_id = p_user_id;

  return jsonb_build_object('allowed', true, 'found', true);
end;
$$;

create or replace function public.recruitos_reserve_resume_analysis_usage(
  p_user_id uuid,
  p_resume_id uuid,
  p_job_id uuid,
  p_window_start timestamptz,
  p_window_end timestamptz,
  p_period text,
  p_resume_analysis_limit integer
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_usage integer;
begin
  if p_resume_analysis_limit < 1 then
    raise exception 'RESUME_ANALYSIS_LIMIT_INVALID';
  end if;

  if p_period not in ('day', 'month') or p_window_end <= p_window_start then
    raise exception 'RESUME_ANALYSIS_WINDOW_INVALID';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('recruitos-usage:' || p_user_id::text, 0));

  if not exists (
    select 1
    from public.resumes
    where id = p_resume_id
      and user_id = p_user_id
  ) or not exists (
    select 1
    from public.jobs
    where id = p_job_id
      and user_id = p_user_id
  ) then
    return jsonb_build_object('allowed', false, 'reason', 'not_found');
  end if;

  -- Existing durable analyses in the current window count immediately when
  -- Phase 3D is introduced. A retry of that same durable resume/job work item
  -- does not consume a second unit in the same window.
  if exists (
    select 1
    from public.resume_analyses
    where user_id = p_user_id
      and resume_id = p_resume_id
      and job_id = p_job_id
      and created_at >= p_window_start
      and created_at < p_window_end
  ) then
    return jsonb_build_object(
      'allowed', true,
      'duplicate', true
    );
  end if;

  if exists (
    select 1
    from public.recruitos_resume_analysis_usage
    where user_id = p_user_id
      and resume_id = p_resume_id
      and job_id = p_job_id
      and window_start = p_window_start
  ) then
    return jsonb_build_object(
      'allowed', true,
      'duplicate', true
    );
  end if;

  -- Count durable current-window analyses plus accepted reservations that have
  -- not yet produced a durable current-window analysis. UNION prevents the
  -- same logical resume/job work item from being counted twice.
  select count(*)::integer
  into v_usage
  from (
    select a.resume_id, a.job_id
    from public.resume_analyses a
    where a.user_id = p_user_id
      and a.created_at >= p_window_start
      and a.created_at < p_window_end
    group by a.resume_id, a.job_id

    union

    select u.resume_id, u.job_id
    from public.recruitos_resume_analysis_usage u
    where u.user_id = p_user_id
      and u.accepted_at >= p_window_start
      and u.accepted_at < p_window_end
      and not exists (
        select 1
        from public.resume_analyses a
        where a.user_id = p_user_id
          and a.resume_id = u.resume_id
          and a.job_id = u.job_id
          and a.created_at >= p_window_start
          and a.created_at < p_window_end
      )
  ) as current_usage;

  if v_usage >= p_resume_analysis_limit then
    return jsonb_build_object(
      'allowed', false,
      'usage', v_usage
    );
  end if;

  insert into public.recruitos_resume_analysis_usage (
    user_id,
    resume_id,
    job_id,
    period,
    window_start,
    window_end
  )
  values (
    p_user_id,
    p_resume_id,
    p_job_id,
    p_period,
    p_window_start,
    p_window_end
  );

  return jsonb_build_object(
    'allowed', true,
    'duplicate', false
  );
end;
$$;

revoke all on function public.recruitos_create_job_with_limit(uuid, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.recruitos_create_job_with_limit(uuid, text, text, integer)
  to service_role;

revoke all on function public.recruitos_open_job_with_limit(uuid, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.recruitos_open_job_with_limit(uuid, uuid, integer)
  to service_role;

revoke all on function public.recruitos_reserve_resume_analysis_usage(uuid, uuid, uuid, timestamptz, timestamptz, text, integer)
  from public, anon, authenticated;
grant execute on function public.recruitos_reserve_resume_analysis_usage(uuid, uuid, uuid, timestamptz, timestamptz, text, integer)
  to service_role;
