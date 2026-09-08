-- RecruitOS Phase 2C: durable, user-owned command executions and operational progress.
-- Read-only/preparatory execution only; no hiring decisions are mutated by these tables.

create table if not exists public.recruitos_command_executions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  intent text not null,
  command_text text not null,
  requested_count integer not null default 8,
  requested_job_text text,
  scope_job_id uuid references public.jobs(id) on delete set null,
  resolved_job_id uuid references public.jobs(id) on delete set null,
  status text not null default 'queued',
  stage text not null default 'understanding_request',
  work_state jsonb not null default '{}'::jsonb,
  result jsonb,
  error_code text,
  error_message text,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint recruitos_command_executions_intent_check
    check (intent in ('review_and_rank_candidates')),
  constraint recruitos_command_executions_status_check
    check (status in ('queued', 'running', 'completed', 'failed', 'cancelled', 'clarification_required')),
  constraint recruitos_command_executions_requested_count_check
    check (requested_count between 1 and 25),
  constraint recruitos_command_executions_command_length_check
    check (char_length(command_text) between 1 and 4000),
  constraint recruitos_command_executions_idempotency_unique
    unique (user_id, idempotency_key)
);

create table if not exists public.recruitos_command_events (
  id bigint generated always as identity primary key,
  execution_id uuid not null references public.recruitos_command_executions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  message text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint recruitos_command_events_kind_check
    check (kind in ('status', 'progress', 'warning', 'completed', 'failed', 'cancelled', 'clarification')),
  constraint recruitos_command_events_message_length_check
    check (char_length(message) between 1 and 500)
);

create index if not exists recruitos_command_executions_user_created_idx
  on public.recruitos_command_executions(user_id, created_at desc);
create index if not exists recruitos_command_executions_user_status_idx
  on public.recruitos_command_executions(user_id, status, updated_at desc);
create index if not exists recruitos_command_executions_job_idx
  on public.recruitos_command_executions(user_id, resolved_job_id, created_at desc);
create index if not exists recruitos_command_events_execution_cursor_idx
  on public.recruitos_command_events(execution_id, id);
create index if not exists recruitos_command_events_user_created_idx
  on public.recruitos_command_events(user_id, created_at desc);

alter table public.recruitos_command_executions enable row level security;
alter table public.recruitos_command_events enable row level security;

drop policy if exists "Users can view their own RecruitOS command executions" on public.recruitos_command_executions;
drop policy if exists "Users can create their own RecruitOS command executions" on public.recruitos_command_executions;
drop policy if exists "Users can update their own RecruitOS command executions" on public.recruitos_command_executions;

create policy "Users can view their own RecruitOS command executions"
  on public.recruitos_command_executions for select
  using (user_id = auth.uid());

create policy "Users can create their own RecruitOS command executions"
  on public.recruitos_command_executions for insert
  with check (
    user_id = auth.uid()
    and (scope_job_id is null or exists (
      select 1 from public.jobs j where j.id = scope_job_id and j.user_id = auth.uid()
    ))
    and (resolved_job_id is null or exists (
      select 1 from public.jobs j where j.id = resolved_job_id and j.user_id = auth.uid()
    ))
  );

create policy "Users can update their own RecruitOS command executions"
  on public.recruitos_command_executions for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (scope_job_id is null or exists (
      select 1 from public.jobs j where j.id = scope_job_id and j.user_id = auth.uid()
    ))
    and (resolved_job_id is null or exists (
      select 1 from public.jobs j where j.id = resolved_job_id and j.user_id = auth.uid()
    ))
  );

drop policy if exists "Users can view their own RecruitOS command events" on public.recruitos_command_events;
drop policy if exists "Users can create their own RecruitOS command events" on public.recruitos_command_events;

create policy "Users can view their own RecruitOS command events"
  on public.recruitos_command_events for select
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.recruitos_command_executions e
      where e.id = execution_id and e.user_id = auth.uid()
    )
  );

create policy "Users can create their own RecruitOS command events"
  on public.recruitos_command_events for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.recruitos_command_executions e
      where e.id = execution_id and e.user_id = auth.uid()
    )
  );
