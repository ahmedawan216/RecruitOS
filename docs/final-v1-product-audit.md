# RecruitOS final v1 audit: recovery fixes, launch validation blocked

Branch: final-v1-product-audit
Base: 4e3110c68b9af913d92bab4c75e4a965461e2ed2

## Confirmed causes and fixes

The batch UI used upload success to choose its status display even after analysis returned an error. As a result, successfully extracted PDFs whose analysis failed still said Ready to analyze. Request exceptions were console-only, all selections were cleared after any returned batch, and the persistent local allowance counted every result including failed uploads.

The minimal fix:

- Store analysis errors separately and render them visibly, including saved legacy errors and candidate-profile warnings. Errors use role=alert; checkbox names identify their resume.
- Preserve failed and unattempted selections, including when a plan limit stops a batch. Explicit retry includes only eligible, uncompleted resumes and removes duplicate/stale IDs.
- Preserve uncertain request outcomes in per-resume persisted state. Do not claim a missing response proves nothing was saved.
- Clear old errors only for confirmed successes. Keep successful View analysis links.
- Count successful processing results toward the existing local 25-resume batch allowance; failed attempts no longer exhaust it. Server limits are unchanged.
- Disable conflicting upload/selection operations while analysis runs and prevent uploads before saved state is restored.

No server action, schema, RLS, provider validation, entitlement, billing, metrics, branding, or consequential-action behavior changed.

## Live evidence

Used the existing authenticated account and existing Junior AI Engineer role. No fresh account was created and no real candidate status was changed.

- Empty PDF upload: correctly rejected. The old UI incorrectly included it in the processed count.
- Two fictional PDFs, alex-audit.pdf and jordan-audit.pdf: PDF extraction succeeded; batch analysis returned to Ready, cleared selection, and hid failure. Refresh preserved that misleading state.
- Read-only database checks: both original resumes have successful extraction, null candidate_id, analysis usage reservations, and no saved analyses. Counts did not change because candidates/matches were not created; this is not evidence of stale workspace metrics.
- Resumed audit: uploaded the same fictional Alex fixture once through the existing single-resume route to obtain visible diagnostics. It reported candidate-profile extraction could not complete. Its explicit Analyze candidate retry returned: RecruitOS could not create or update the candidate profile. Please retry the analysis.
- The original contextual command completed against the selected Junior AI Engineer, reused the existing assessment, and restored after the interrupted session. Show me only the concerns completed within the same candidate scope and explicitly reported no status change.

The fictional test uploads remain available for diagnosis. No synthetic analyses or candidate profiles were inserted to make the audit appear successful.

## Remaining launch blocker

Candidate-profile creation/recovery still fails for the test resumes in production. The failure is after successful text extraction and, for the original analysis attempts, after usage reservation; it is before a candidate association or saved analysis. This isolates the failing stage but does not identify whether the cause is the AI provider, returned-profile validation, or candidate persistence.

The connected Vercel app lists only OperationOS_website; RecruitOS project lookup returns 404. No RecruitOS runtime logs or local provider credentials are available. The existing server logs already distinguish candidate-profile validation and candidate recovery failures. Obtain the RecruitOS log entries for the fictional uploads, particularly Candidate recovery failed during analysis and Candidate profile validation failed, to establish the actual underlying cause. Do not loosen validation or invent a backend fix without that evidence.

This branch fixes recovery UX; it is **not a v1 launch sign-off**. A successful production/preview retry and multi-candidate flow are still required. A launch-blocking profile-processing issue remains unresolved.

## Verification

- Full suite: 168 tests passed, 0 failed, 0 skipped (161 existing, 7 new batch recovery tests).
- Typecheck: passed.
- Lint: 0 errors, two pre-existing command-task-surface warnings (effect dependency and unused disable directive).
- Production build: passed, including the final rerun after diff review.
- Diff inspection: one batch UI component, one focused regression test file, this report only.

The new tests invoke the real component handlers with controlled server responses: partial failure then successful retry; request exception and persisted error recovery; plan-limit interruption; missing results/stale selections; failed-upload allowance; busy controls; legacy warnings and accessible labels. These are component tests, not a live deployment of the changed branch.

## Deliberate limits and remaining checks

- No speculative cache/refresh fix: the observed zero new matches correctly corresponds to failed profile creation.
- Existing contextual parser/ownership/approval regression tests pass unchanged. Live multi-candidate comparison and proposal cancellation/approval could not be completed with the failed fictional profiles. No real hiring status was altered for testing.
- Empty states remain covered by the prior controlled rendering tests.
- Existing desktop workspace and direct-upload controls remained usable. New error text wraps, and controls retain existing responsive styles. Dedicated phone/tablet runtime inspection and browser execution of the changed branch remain unverified.
- No P2 redesign or unrelated feature work.

## Ahmed's focused continuation

1. Supply the sanitized RecruitOS server diagnostics for the profile failures; resolve the actual provider/validation/persistence cause.
2. On this branch's preview, retry the fictional resumes. Verify failure selection retention, visible error recovery, successful profile/analysis creation, and View analysis.
3. Compare two distinct analyzed candidates, inspect evidence, return to the role, and refresh.
4. Prepare a status proposal using fictional candidates, cancel, then deliberately approve a new proposal and confirm only the reviewed changes apply.
5. Check narrow-screen controls and then merge only after the remaining blocker is resolved.
