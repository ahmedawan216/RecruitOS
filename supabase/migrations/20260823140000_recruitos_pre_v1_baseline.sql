-- RecruitOS pre-V1 baseline recovered from the legacy shared project.
-- This migration intentionally preserves the historical schema and privileges;
-- ownership, RLS, workspace tables, and relational integrity follow in V1/V2.

-- New Supabase projects may not grant Data API access to newly created public
-- tables by default. Restore the legacy default ACL so tables created later by
-- the preserved V2 migration receive the same privileges as the legacy project.
alter default privileges for role postgres in schema public
  grant all privileges on tables to anon, authenticated, service_role;

create table public.jobs (
  id uuid not null default gen_random_uuid(),
  title text not null,
  description text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jobs_pkey primary key (id),
  constraint jobs_status_check check (status in ('open', 'paused', 'closed'))
);

create index jobs_created_at_idx on public.jobs (created_at desc);
create index jobs_status_idx on public.jobs (status);

create table public.resumes (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  original_filename text not null,
  storage_path text not null,
  status text not null default 'pending',
  extracted_text text,
  extraction_error text,
  constraint resumes_pkey primary key (id),
  constraint resumes_storage_path_key unique (storage_path),
  constraint resumes_extraction_status_check check (status in ('pending', 'success', 'failed'))
);

create table public.resume_analyses (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  resume_id uuid not null,
  job_description_text text not null,
  status text not null default 'pending',
  error_message text,
  recommendation text,
  match_score integer,
  confidence_level text,
  summary text,
  why_strong_match text,
  matching_skills text[],
  missing_skills text[],
  potential_concerns text[],
  years_relevant_experience numeric,
  reasoning text,
  model text,
  raw_response jsonb,
  model_version text,
  job_id uuid,
  recruiter_status text default 'new',
  constraint resume_analyses_pkey primary key (id),
  constraint resume_analyses_resume_id_fkey
    foreign key (resume_id) references public.resumes(id)
    on update no action on delete cascade,
  constraint resume_analyses_job_id_fkey
    foreign key (job_id) references public.jobs(id)
    on update no action on delete cascade,
  constraint resume_analyses_status_check
    check (status in ('pending', 'success', 'failed')),
  constraint resume_analyses_recommendation_check
    check (recommendation in ('interview', 'maybe', 'reject')),
  constraint resume_analyses_match_score_check
    check (match_score between 0 and 100),
  constraint resume_analyses_confidence_level_check
    check (confidence_level in ('low', 'medium', 'high'))
);

-- Preserve the historical index name and definition. The preserved V2
-- migration intentionally skips its same-named composite-index attempt.
create index resume_analyses_job_id_idx on public.resume_analyses (job_id);

-- Reproduce the legacy table ACL deterministically for the base tables.
grant all privileges on table
  public.jobs,
  public.resumes,
  public.resume_analyses
to anon, authenticated, service_role;

-- Provision only the private bucket. V1 creates its four storage policies.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'resumes',
  'resumes',
  false,
  null,
  null
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
