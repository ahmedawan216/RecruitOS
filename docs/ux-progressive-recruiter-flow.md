# Progressive recruiter flow — 16 September 2026

Base: c7f0622f4f7d17e2d7c3bf09f8b399cd644f8b89. Branch: ux-progressive-recruiter-flow.
RecruitOS only; builds on the previous pass without repeating its parser implementation.

## Confirmed findings and decisions

| Priority / transition | Confirmed friction | Change and expected benefit | Risk |
| --- | --- | --- | --- |
| P1 / first arrival → create job | Empty card explains commands and approval before either can be used. | Keep only role creation guidance and its CTA. | Low; confirmed-zero-job condition unchanged. |
| P2 / create job → upload | Product-oriented wording; success says Open job without teaching the next step. | Recruiter-oriented title, requirements placeholder, and Add candidates link to the upload section. | Low; form action and entitlement handling unchanged. |
| P1 / empty job → candidates | Metrics, management, requirements, and competing analysis actions precede ingestion. | Put the existing upload component first in a confirmed empty job; remove the unused empty pipeline/filter choices; demote single-resume analysis to a secondary link. | Low; upload implementation and alternate route preserved. Fetch errors never imply an empty job. |
| P2 / upload → analyze | Batch jargon and “Ready” require interpretation. | Use Upload resumes and “Processed · Ready to analyze”; retain “Analyzed · View analysis.” Copy accurately states PDFs are added one at a time. | Low; processing, local persistence, selection and limits unchanged. |
| P1 / analysis → candidate set | Only generic Job navigation, with no continuation after reading evidence. | Back to candidates and Review or compare candidates both target the same role's candidate section. | Low; no new query or change to evidence. |
| P1 / analyzed candidates → comparison | Comparison action is invisible until checkboxes are selected. | At two distinct analyzed candidates, explain selecting 2–5; disclose command guidance inside “Or ask RecruitOS.” Guidance disappears when two are selected. | Low; existing selection and comparison semantics unchanged. |
| P1 / command discovery | Early approval explanation competes with command context. | “Tell RecruitOS what you want done”; normal-language instructions name the selected job and its applicants. | Low; parser and human-review workflow unchanged. |

No new P0 was confirmed. This is not certification of every production journey.

## Verification evidence and limits

Authenticated live baseline inspection: workspace → job → candidate record → workspace. Current work was restored. The account has one job, one candidate at Interview, and several completed resume records for that same candidate. Live counts of one job and zero New/Reviewing matches agree with that state and stayed unchanged on return navigation and refresh. No production candidate, status, job, resume, or task was changed.

Automated tests render the actual changed page/component implementations with controlled data/action boundaries: zero jobs; zero candidates; one analyzed candidate; two distinct analyzed candidates; repeated candidate IDs; candidate fetch failure; creation initial/success states; analysis return navigation. Existing contextual parser, server ownership, result and approval tests remain in the full suite. These controlled renders are not a live signup/upload/analysis transaction.

The changed branch has not been tested end-to-end against an authenticated preview deployment. Signup/email delivery, new uploads, provider analysis, multi-candidate comparison and proposal creation/cancellation still require preview validation. No consequential production action was applied for testing.

## Investigated and left unchanged

- **Refresh/count report:** the workspace counts owned jobs and candidate-job matches in New or Reviewing, not uploaded files. Analysis updates an existing candidate/job match and preserves its recruiter stage. Multiple resumes can therefore legitimately produce one match; an Interview match is excluded from “matches to review.” The reported transient 0-job state was not reproduced. No metric, cache, refresh or persistence behavior was changed speculatively.
- **Human control:** the existing proposal already says Human review required and Nothing has been changed yet, lists exact changes, and requires Apply or Cancel. It is already contextual; retain its safeguards and wording.
- **Command scope:** the pipeline link opens the existing command workspace. It explicitly instructs selecting this job. Pipeline checkboxes are not passed to commands, and copy makes that distinction. Automatic scope transfer and task-history redesign are deferred to avoid disrupting restored work.
- **Processing errors:** the previous audit's P1 concerning per-file analysis failures/top-level exceptions remains deferred; this pass does not claim to fix it. Exercise mixed-success retries before a broader upload lifecycle change.
- No next-candidate query, multi-file picker, onboarding persistence, modal, tour, dependency, migration, billing or design-system change.

## Checks

- Full suite: 161 tests passed, 0 failed (154 existing + 7 new).
- Typecheck: passed.
- Lint: 0 errors; the two existing command-task-surface warnings remain (effect dependency, unused disable directive).
- Production build: passed (Next.js 15.5.25; all 10 static pages generated).
- Diff: only seven UI files, the existing first-session test file, and this report. No unrelated implementation changes.

## Preview checks before merge

1. Fresh account: signup/confirmation → focused first-job card → create job → Add candidates reaches the primary upload flow.
2. Upload and analyze two **distinct** candidates. Confirm processed/analyzed statuses and open each analysis; return via the candidate-set link and compare using 2–5 checkboxes.
3. Expand Or ask RecruitOS, open commands, select the same job, and use the displayed example. Confirm restored work remains understandable. “This role” must use the selected owned job; conflicting explicit role titles must still ask for clarification.
4. Prepare a consequential proposal and cancel it; verify nothing changes. Apply only intentionally approved changes in disposable test data.
5. Compare workspace counts before navigation, on return from analysis, and after refresh. Record candidate identities and stages along with counts if they diverge; investigate that reproducible sequence before changing metrics.
