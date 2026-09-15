# RecruitOS first-session UX audit

Baseline: `afc3ff21db4e92a6adfbf96ac2dbea98c29df1de` (main, 15 September 2026).
Scope: RecruitOS only. No branding, pricing, entitlement, data migration, or architecture changes.

## Evidence and limits

Before implementation, all 169 source files were verified against GitHub blob hashes. Live browser inspection covered the OperationOS entry link, RecruitOS signup, and transition to sign-in. Authenticated screens below were traced in source, including their server actions and result transitions; they were not observed with a signed-in recruiter. Findings are code-supported flow findings, not claims of a completed live user test.

The journey is account creation → email confirmation when required → workspace → job creation → job workspace → upload → analysis → candidate evidence → comparison → command result → follow-up → reviewed proposal → return to work. Existing ownership checks, bounded candidate sets, explicit proposal approval, stale-proposal rejection, and stored-evidence explanations are strengths to preserve.

## P0 — first-session blockers

No confirmed application-wide P0. Authenticated end-to-end runtime validation remains outstanding; absence of a confirmed P0 is not a clean bill of health.

## P1 — major confusion and friction

| ID / where | Recruiter experience and cause | Proposed fix / expected improvement | Risk / decision |
| --- | --- | --- | --- |
| P1-1 Workspace → command | “Compare the candidates for this role and show me the strongest matches, key strengths, and any important gaps” conflicts with the selected job. The parser treats a contextual reference as a title. | Recognize complete contextual role references only when a selected, owned job exists; preserve explicit conflicting-title checks. The recruiter can use context already on screen. | Low, behavioral tests required. Implement. |
| P1-2 Workspace → typed command | A job drives the heading and suggestions, but a typed command starts with no selected job. Suggested and typed commands behave differently. | Initialize the visible job selector from workspace context, label it “Job,” and explain its relationship to “this role.” Retain explicit title lookup. | Low. Implement. |
| P1-3 First arrival with no jobs | The largest surface asks for commands that cannot run yet, including “for a job” examples; Create job is a secondary text action below it. | Show a focused Create your first job panel in the command position only for a confirmed empty workspace. Reveal commands after a job exists. | Low. Implement. Do not treat a fetch error as an empty workspace. |
| P1-4 Result → comparison follow-up | “Compare … and show … gaps” opens concerns instead; “compare these candidates” asks for a count even for a small, known set. | Prioritize explicit comparison; resolve generic current-set comparisons using the validated task candidate count within the existing 2–8 limit. Keep count clarification when the set is unknown or too large. | Low–medium. Implement with client/server agreement and regression tests. |
| P1-5 Failed command → recovery | New task clears the failed wording, forcing the recruiter to rewrite it. | Offer Edit command on failed/clarification tasks; retain text and valid resolved job where available. Successful tasks still start blank. | Low. Implement. |
| P1-6 Upload → analysis | Batch failures can still look “Ready”; top-level analysis exceptions are only logged. Returning to the pipeline may not show fresh analysis without refresh. | Show per-file analysis failures and retry states; refresh server data after completed work. | Medium: requires exercising partial success, retries and existing browser persistence. Defer from this bounded pass. |
| P1-7 Candidate → missing analysis | Analyze resume links back to upload even when a resume is attached. The recruiter can unnecessarily upload the same file again. | Reuse the owned resume through an explicit analyze-existing action, with visible job context and current entitlement handling. | Medium: analysis result route currently requires an existing analysis, so changing the link alone is insufficient. Defer. |
| P1-8 Job workspace → commands | The job page has no direct command entry; returning to the workspace can choose a different recent review job. | Add a deliberate job-scoped entry into the existing command workspace, preserving active-task recovery. | Medium: latest task recovery is global and can override the intended role. Defer pending scoped recovery design. |

## P2 — meaningful improvements

| ID / where | Recruiter experience and cause | Proposed fix / expected improvement | Risk / decision |
| --- | --- | --- | --- |
| P2-1 Job creation → first candidate | The completed form remains and offers Open job without a concrete next step. | Say the next step is uploading resumes, and label the job link accordingly. Prevent duplicate creation through a success-only continuation in a later pass. | Copy low; form-state change medium. Defer. |
| P2-2 Job workspace | Metrics, job controls and full requirements precede candidates and upload. | Collapse requirements by default and promote the next action based on candidate state. | Medium; needs authenticated desktop/mobile inspection. Defer. |
| P2-3 Candidate pipeline → compare | Compare appears only after selecting two records; the five-record cap silently ignores further selections. | Explain selection before interaction and announce the cap. | Low, defer to keep this pass centered on first arrival and commands. |
| P2-4 Score → evidence | Probability disclaimers are present, but “stored match” is internal language and confidence lacks a compact explanation. | Explain that the score compares resume evidence with this job, and direct the reader to evidence and gaps. | Low copy risk, but avoid inventing a scoring formula. Defer. |
| P2-5 Follow-up → changing roles | Follow-ups are bounded to the task, but analytical phrases can mention a different job without a clear role-conflict explanation. | Detect explicit role changes separately from skill-focus phrases; ask the recruiter to start a task for that job. | Medium: broad text matching could reject legitimate skill requests. Defer with dedicated role/skill ambiguity cases. |
| P2-6 Returning to work | Only the latest command task is restored; New task dismisses it with no task-history picker. Candidate back links also lead to all candidates rather than the originating job. | Clarify task dismissal and add contextual return links first; design history separately. | History medium; return links low. Defer. |
| P2-7 Sign-in recovery | No visible forgotten-password or resend-confirmation route. | Design account recovery using existing auth safeguards and redirects. | Medium; email delivery and token flow require integration testing. Defer. |

## P3 — polish

| Where | Experience / cause | Fix / expected improvement | Risk / decision |
| --- | --- | --- | --- |
| Signup and command help | “Supabase authentication flow,” “Real execution,” and “bounded semantic evidence pass” expose implementation vocabulary. | Use task-focused language without changing the control model. | Low. Clean up touched command help and signup password guidance. |

## Implementation boundaries

Keep all capabilities and human-review safeguards. Context is an input to the existing server-owned resolution, never authorization. No implicit candidate status changes, inferred hiring decisions, broader candidate sets, new limits, database changes, or visual-system changes. Explicitly named conflicting jobs must still require clarification. Unknown or invalid selected job IDs must still fail.

## Validation plan

Run lint, typecheck, all repository tests, build, and review the complete diff. Add parser-to-resolver coverage for the reported command, contextual variants, no context, invalid/foreign context, explicit conflicting titles, consequential commands, comparison priority and count limits. Revisit the source journey after implementation; report live-auth and environment limitations separately.

## Subsequent live inspection and implemented outcome

Secure sign-in succeeded after the initial source audit. Live inspection then covered restoration of a previously applied action, workspace → job → candidate evidence → workspace → upload → workspace → create job. The existing account has one job and one candidate. Candidate evidence, score caveats, current pipeline status, upload guidance and job creation inputs were verified in the live DOM. No candidate data, status, job, resume, or existing task was changed during inspection. The production application still runs the baseline, not this branch.

Live inspection confirmed P1-8, P2-2 and P2-6. It also confirmed that the upload heading says “this role” without showing the job title (P2: add the owned job title in a future upload pass). Signup form and sign-in were inspected; new account creation/email delivery were not exercised. With only one existing candidate, live multi-candidate comparison was not possible without adding test data. Proposal creation and approval were verified through source and the existing safety tests, not by applying another live recruiting action.

Implemented P1-1 through P1-5, plus the P3 copy cleanup. Generic “compare these candidates” uses the displayed result candidate count on both client and server, so a smaller comparison stays within that displayed set. Explicit top-N and strongest-candidate commands retain their existing task behavior. The existing 2–8 comparison limit is unchanged; larger or unknown generic sets require clarification. “This role” never resolves without a valid selected owned job. Fully explicit conflicting role names remain blocked.

After implementation, the source journey starts with job creation, continues through existing upload/analysis flows, and reveals commands with the job selected. The reported comparison can resolve to that role; comparison follow-ups keep strengths and gaps together. Failed or clarification tasks offer Edit command with the original text. Existing reviewed proposals and successful-task recovery remain intact. Broader issues above are deliberately deferred.

Validation: 154 tests, including 10 added parser/resolver and rendered-component tests; lint (two confirmed pre-existing warnings), typecheck, and production build. The build reports the existing Supabase Edge Runtime compatibility warning. Full diff review confirms only five implementation files, two test files and this audit changed. No dependencies, lockfile, migrations, billing, brand assets, or OperationOS_website files changed.

Local Git was reconstructed from the verified source snapshot and the exact original commit object, checked against its GitHub SHA, because direct HTTPS cloning was unavailable. Publication uses GitHub's Git object APIs with the original main commit as parent. Nothing is merged into main. Authenticated runtime testing of the changed branch, fresh-account creation, new uploads/analysis and multi-candidate proposal execution remain release-validation work; automated checks and baseline inspection do not substitute for those checks.
