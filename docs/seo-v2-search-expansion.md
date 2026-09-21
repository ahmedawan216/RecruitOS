# SEO V2 search-expansion decision

## Evidence limits

This V2 pass does not have a reliable source for keyword volume, CPC, keyword difficulty, competitor traffic, or fixed-US-location rankings. Those metrics must not be inferred from the search results below. Target selection is based on observed result intent, RecruitOS product fit, usefulness to recruiters, and avoiding overlap with the existing V1 pages.

Search-result sampling on September 21, 2026 found:

- Dedicated recruiter resources for “resume screening checklist,” including TestGorilla, Truffle, CVViZ, and other recruiting vendors. This supports a distinct checklist intent rather than another general resume-screening product page.
- “Candidate evaluation template” results commonly lead to forms and interview scorecards. RecruitOS already has an evidence-based resume-review worksheet, so it should clarify that scope instead of claiming to be a full interview scorecard.
- “Recruitment workflow software” results describe broad applicant-tracking and full-lifecycle automation platforms. RecruitOS should use the narrower “candidate review workflow” language on its existing homepage and should not create a broad workflow-software landing page.
- “Compare candidates” and “candidate comparison” results are frequently about elections. The existing RecruitOS page should remain a supporting recruiter page and can clarify hiring intent with a practical comparison matrix.

Representative sources:

- https://www.testgorilla.com/blog/resume-screening-checklist/
- https://www.hiretruffle.com/blog/resume-screening-checklist
- https://cvviz.com/resume-screening-guide/
- https://www.cpp.edu/eoda-hr/departments/ta/docs/candidate-evaluation-form.pdf
- https://www.pinpointhq.com/features/recruitment-workflow-software
- https://talogy.com/en-ae/knowledge-hub/candidate-screening/

## Existing intent ownership

| Page | Primary responsibility |
| --- | --- |
| RecruitOS / | Commercial product intent for a structured recruiting and candidate-review workspace |
| /resume-analysis | Product/problem intent for recruiter-side resume screening and role-based analysis |
| /compare-candidates | Supporting mid-funnel intent for comparing job candidates using the same role evidence |
| /guides/candidate-evaluation-template | Informational/template intent for documenting role requirements, resume evidence, uncertainty, and follow-up questions |
| OperationOS /recruitos | Parent-company and product-context bridge |
| OperationOS /blog/ai-resume-screening | Broad educational intent for understanding AI-assisted resume screening |

No duplicated V1 page needs removal. The main missing intent is a reusable resume-screening process checklist.

## V2 target map

| Target query/theme | Intent | Destination | Status | Why RecruitOS legitimately satisfies it |
| --- | --- | --- | --- | --- |
| resume screening checklist for recruiters | Informational/task | /guides/resume-screening-checklist | NEW | RecruitOS can provide an ungated checklist for defining role criteria, labeling evidence, checking uncertainty, and keeping the final decision with people. |
| how to screen resumes against a job description | Problem-aware/product | /resume-analysis | EXISTING | RecruitOS analyzes a resume within a selected job context and surfaces strengths, gaps, concerns, and supporting evidence for recruiter review. |
| evidence-based candidate evaluation form/template | Informational/task | /guides/candidate-evaluation-template | EXISTING | The current downloadable worksheet records requirements, source evidence, evidence labels, questions, and reviewer notes without requiring signup. |
| candidate comparison matrix for hiring | Problem-aware/task | /compare-candidates | EXISTING | RecruitOS compares candidates in the same role context; the page can add a reusable blank matrix while preserving the warning that scores are not hiring probabilities. |
| structured candidate review workflow | Commercial/problem-aware | / | EXISTING | The product connects jobs, candidates, resume analysis, comparison, commands, and human-reviewed actions in one workspace. This is narrower and more accurate than claiming full recruitment-workflow or ATS coverage. |

## Implementation boundaries

1. Create one new page only: /guides/resume-screening-checklist.
2. Strengthen the three existing task pages for their mapped long-tail intent without changing their core responsibilities.
3. Clarify “structured candidate review workflow” on the existing RecruitOS homepage; do not create a competing workflow-software page.
4. Add the new guide to the sitemap, analytics landing-page allowlist, shared related-resource navigation, and relevant homepage/footer links.
5. Add only contextual OperationOS links from the existing RecruitOS bridge and AI-screening article.
6. Preserve recruiter-side positioning, privacy-safe analytics, human review, and the statement that match scores are not hiring probabilities.

## Deliberately deferred

- Generic “AI recruiting tools,” “AI recruitment software,” and “best recruiting software” pages: broad comparison SERPs and insufficient product differentiation for a legitimate V2 page.
- Staffing-agency pages: the ICP remains unconfirmed.
- Interview scorecard page: RecruitOS V1 evaluates resume evidence and does not provide a complete interview-scorecard workflow.
- Full recruitment-workflow software page: current product scope does not cover every sourcing, communication, interview, offer, and onboarding stage implied by that query.
- Competitor-alternative or review pages: no basis for fair first-hand comparisons.
- Additional AI-responsibility page: human control remains supporting product/trust positioning, but no distinct primary search opportunity was established.
