# RecruitOS

RecruitOS is an AI-assisted recruiting workspace for screening resumes,
understanding candidate fit, and managing hiring pipelines while keeping
recruiters in control of hiring decisions.

## Stack

- Next.js 15.5 App Router and React 19
- TypeScript and Tailwind CSS
- Supabase authentication, database, and storage
- OpenAI-compatible AI processing and PDF resume extraction
- PostHog, Vercel Analytics, and Vercel Speed Insights

## Local development

```bash
npm ci
npm run dev
```

The application opens at `http://localhost:3000`. Public product information
is available at `/` and `/recruitos`; authenticated workspace routes live
under `/dashboard`, with resume upload at `/upload`.

## Environment variables

Copy the variable names documented in `.env.example` into your local
environment. Never commit secret values.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`

The example site URL is local-only. Configure the final deployment origin when
a RecruitOS production domain is confirmed; no production domain is encoded in
source.

## Validation

```bash
npm run typecheck
npm run lint
npm run build
```

## Database history

Tracked RecruitOS migrations live in `supabase/migrations`. They establish
record ownership, row-level security, storage policies, and the V2 candidate
workspace. Do not edit or execute them without a separately reviewed database
change plan.

## Security boundaries

Dashboard routes require an authenticated Supabase user. Server actions and
RecruitOS APIs independently authenticate callers and scope privileged
service-role operations to the authenticated user's records. The service-role
credential is server-only and must never use a public environment-variable
prefix.
