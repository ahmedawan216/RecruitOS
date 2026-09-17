# RecruitOS launch analytics

Branch: `launch-analytics-posthog`. No merge or production deployment is authorized by this change.

## Architecture

- Existing official `posthog-js` SDK initialized through Next.js 15's `instrumentation-client.ts`, only with consent and valid environment configuration.
- A small client provider handles recruiter identity, landing views and workspace visits. Signup starts at a valid form submission, once per form instance.
- Server actions/services emit after completed durable outcomes. `captureOutcome` uses the official PostHog Capture API and Next.js `after`, with a 2-second timeout. Telemetry failure cannot change product results. No database, RLS, authorization, billing or human-review changes.
- No new dependencies. The latest Node SDK requires a newer Node baseline than this repository declares; the documented HTTP Capture API avoids changing the application's runtime requirement.
- Runtime event/property allowlists on both sides rebuild the outbound payload. No object spreading of candidate/domain records into telemetry.

## Events

All custom events may include reviewed `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `referring_domain`, and `landing_page`, plus `auth_state` (`anonymous`/`authenticated`) and `environment` (`production`/`preview`/`development`). Missing attribution is omitted.

| Event | Exact additional properties | Success point |
|---|---|---|
| `landing_page_viewed` | None | `/` or `/recruitos` rendered with consent; not every workspace page |
| `signup_started` | None | Valid signup form submitted; once per mounted form, retries excluded |
| `signup_completed` | `confirmation_required` boolean | Auth returns a real new user with identities; obfuscated existing-user responses and errors excluded |
| `job_created` | `job_count: 1` | Existing authoritative job creation succeeds |
| `resume_processed` | `resume_count: 1`, `profile_created` boolean | Extracted text saved successfully; failed extraction excluded, optional structured-profile failure represented honestly |
| `candidate_analysis_completed` | `analysis_count: 1` | Analysis plus candidate workflow and activity persisted successfully |
| `candidate_comparison_completed` | `candidate_count` integer | Command comparison persisted, or an owned standalone comparison rendered with at least two candidates and no query errors |
| `command_completed` | `command_type`, `candidate_count`; `partial` boolean for shortlist | Shortlist, contextual result, semantic result, or approved status change persisted successfully |
| `workspace_visited` | `return_visit` boolean | Authenticated dashboard navigation or browser focus, at least 30 minutes since previous observed visit (not an activity heartbeat) |

Allowed command types: `shortlist`, `compare_candidates`, `show_concerns`, `show_overview`, `skill_focus`, `analytical_refocus`, `candidate_status_change`.

A comparison emits both comparison and command events. Use an OR step for comparison/command adoption, not two mandatory consecutive steps. Recovered/failed/cancelled commands and unapproved status proposals do not count. Polling and reloads do not emit server completion events. Standalone comparisons deduplicate the same candidate/analysis set across reloads with a bounded browser marker (cleared on logout/withdrawal). Server events use stable hashed operation UUIDs for ingestion deduplication; repeat analysis of the same analysis record represents one activation, not provider-call billing. Counts are per outcome, not total workspace counts.

`signup_completed` means account creation, not email confirmation. Confirmed login/activation is represented by authenticated workspace usage. An unconfirmed existing signup can be returned again by Auth; the stable event UUID makes that the same signup event. Delivery is best effort, not an exactly-once transactional audit log.

## Privacy and consent

- No PostHog initialization, persistence or events before opt-in. Rejecting, DNT, or GPC prevents capture. Server handlers also check consent/DNT/GPC.
- Replay disabled globally, including auth and all candidate/resume pages. External SDK dependency loading, autocapture, automatic pageviews/pageleave, dead/rage clicks, heatmaps, performance capture, exception capture, surveys, feature flags and console recording disabled. Defense-in-depth masks all text/inputs/attributes and blocks the body from replay.
- `before_send` drops every event except the nine custom events and required `$identify`; it removes SDK automatic URLs, referrers, person properties and arbitrary payload fields.
- No names, emails, phone numbers, addresses, filenames, resume/profile text, raw job descriptions, raw commands, analysis content, auth credentials or provider responses. No candidate/job/resume IDs are event properties. Internal operation IDs are hashed into opaque deduplication UUIDs.
- The PostHog project token is the intended public ingestion credential, not a private API key or auth token.
- Retained protocol metadata: event name, timestamp, random event UUID, recruiter/random visitor distinct ID, browser session ID when valid, public ingestion token, `$anon_distinct_id` on identity linking, `$process_person_profile`, `$is_identified`, `$geoip_disable: true`, `$ip: null`. First attribution is stored as allowlisted `$set_once` person properties.
- PostHog necessarily receives network addresses in transit; IP-based analytics enrichment is disabled. This is not a claim of anonymous networking.
- `/analytics-privacy` describes analytics and allows withdrawal/re-enabling. This focused notice does not replace a complete company privacy policy. Existing Vercel Analytics and Speed Insights are unchanged.
- Choice and first attribution cookies last up to 90 days, host-only, SameSite=Lax, Secure on HTTPS. Identity/visit markers use browser localStorage. Withdrawal clears our attribution, identity, visit and SDK persistence; requests already captured/in flight may still finish delivery. Withdrawal does not erase historical events.

## Attribution

Initial reviewed attribution is retained in a first-party cookie through signup, reloads and email confirmation in the same browser. Only reviewed values in `lib/analytics/schema.ts:utmValues` are sent; unknown values are omitted, never forwarded verbatim. This intentionally prevents PII in URLs from entering analytics. Add reviewed campaign labels before sending new campaign links.

Known referring domains are canonicalized (`linkedin.com`, `facebook.com`, `google.com`, `bing.com`, `t.co`, `reddit.com`); other external hosts become `external`. Same-origin or absent referrers become `direct`. Landing pages use fixed categories; dashboard identifiers become `/dashboard`, unknown routes become `other`. No query strings or hashes are sent. Google Ads click IDs are not collected.

Examples (all labels supported):

- LinkedIn: `/?utm_source=linkedin&utm_medium=outreach&utm_campaign=recruitos-launch&utm_content=dm`
- Facebook: `/?utm_source=facebook&utm_medium=community&utm_campaign=community-launch&utm_content=group-post`
- Future Google Ads: `/?utm_source=google&utm_medium=cpc&utm_campaign=google-search&utm_content=ad-a&utm_term=recruiting-software`
- Preview: `/?utm_source=linkedin&utm_medium=outreach&utm_campaign=preview-test&utm_content=dm`

Google organic can be identified by `referring_domain=google.com` without paid UTMs. Direct means no external referring source was available; browsers/apps that strip referrers cannot be reliably distinguished without UTMs. Attribution is first touch for the consented browser period, not multi-touch attribution. No pre-consent history is persisted. Cross-device anonymous linking is not claimed.

## Identity and funnel configuration

`identify(verifiedUserId)` links anonymous browser events to the recruiter after authenticated rendering. No recruiter email or display name is sent. `reset(true)` isolates logout/account changes; attribution and visit markers are cleared when accounts change. Server events use the authenticated recruiter ID, never a client-supplied identity. Signup uses Auth's returned real user ID. Attribution `$set_once` preserves first known labels on the person across later sign-ins; segment by person properties when later browser event attribution is absent/different.

Build a unique-person funnel: landing → signup started → signup completed → job → resume → analysis → comparison OR command → workspace visit with `return_visit=true`. A new authenticated user may visit the workspace before job creation; use the return flag for the final step. For broader retention, use repeated meaningful outcome events or PostHog retention analysis, not just the coarse browser visit marker. Clearing storage can reset the return marker.

## Configuration and verification

Required (already configured by owner):

- `NEXT_PUBLIC_POSTHOG_KEY`: RecruitOS US project ingestion token.
- `NEXT_PUBLIC_POSTHOG_HOST`: `https://us.i.posthog.com`.
- Both Preview and Production. `next.config.ts` exposes the non-secret `VERCEL_ENV` classification as `NEXT_PUBLIC_VERCEL_ENV` to distinguish traffic; filter all production insights to `environment=production`. Verify browser events show `preview` in the first preview smoke check; the local fallback is `development`.

No personal key is needed. Leave session replay off in project settings. Environment changes require a new build.

Safe smoke test on the feature deployment, with a disposable recruiter and fictional resumes only:

1. Open the preview campaign URL above in a fresh browser. Before consent, verify no request to PostHog and no analytics cookie/SDK storage. Decline: same result.
2. Open `/analytics-privacy`, allow analytics, return to the campaign landing page. In PostHog Activity/Live events, filter `environment=preview`. Inspect every received property, including automatic properties. Confirm no full URL/query, email, filename, content or exception payload. There must be no `$snapshot` or `$autocapture` events.
3. Start signup with a new disposable test account. Submit once and test a failed retry: `signup_started` once, `signup_completed` only on real account creation. Confirm email and sign in; inspect `$identify` linking and the same person timeline. Never paste auth tokens into analytics.
4. Create one test job, process two fictional resumes, complete analysis, then run a shortlist and compare two candidates. Confirm counts and exactly the applicable completion events. Refresh/poll the result: no new completion events. Failed extraction/analysis must not count.
5. If testing a status command, verify the event appears only after explicit approval and successful apply. Cancelled proposals must not count.
6. Return to the workspace after a 30-minute gap between observed visits: `workspace_visited.return_visit=true`. Immediate reload does not add another visit event.
7. Sign out and sign into a different disposable account: identities must not merge. Withdraw analytics: no subsequent events, and local attribution/visit state cleared. Also test DNT/GPC.
8. Confirm production events remain separable. After a separately authorized merge/deploy, repeat the smoke test on production with `environment=production`, then exclude test users from business reporting.

Local regression tests use mocked Auth, cookies and delivery to avoid real candidate data or telemetry. An actual PostHog project receipt and authenticated preview funnel must be verified separately; unit tests alone do not prove delivery.

## Implementation verification (2026-09-17)

- Analytics regression tests: 13 passed; complete suite: 188 passed.
- Typecheck: passed. Lint: no errors; two pre-existing warnings in `command-task-surface.tsx`.
- Production build: passed with the existing locked dependencies and without production credentials.
- Production-server HTTP smoke: `/`, `/sign-up`, `/analytics-privacy` returned 200 with expected content.
- Diff/whitespace inspection: passed. No dependencies, database migrations, billing, pricing or SEO changes.
- Cloud browser could not access the local server (`ERR_BLOCKED_BY_CLIENT`). The Vercel connector exposed the older marketing project and returned 404 for RecruitOS. No authenticated preview funnel or PostHog event receipt is claimed by these local checks. Complete the live checklist above before merging.
