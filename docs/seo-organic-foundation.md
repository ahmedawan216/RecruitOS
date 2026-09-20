# RecruitOS SEO and organic acquisition foundation — 17 September 2026

## Evidence and limitations
Baseline: RecruitOS main fdf5d16a10d28b8e2483aaef5e555ee84d29177c; local Git tree bd215ddeeebf6262cd912c845c98839ca322cac6 matched GitHub. Private Git transport lacked credentials, so GitHub connector verified main. OperationOS main 4889a2d8a1ec766bfcd7898c09cdd1edb5971b51 was cloned normally. Neither main is to be merged or changed.

Live browser inspection confirmed both homepages, readable content, H1s, navigation, canonicals and social metadata. RecruitOS had no JSON-LD, robots source or sitemap source. Root layout forces dynamic rendering and obtains auth state; changing this would risk behavior and is deferred. RecruitOS's /recruitos duplicated the homepage. Analytics recognized only the two old landing routes; unknown new routes would become `other`. OperationOS already had Organization/WebSite schema, robots, sitemap, descriptive images, page metadata helpers, company/trust pages and an existing screening guide. Its root keyword list mixed parent and product topics; removed because it adds no useful search responsibility. Sitemap dates were stale; output now omits unverified dates rather than inventing freshness.

Search attempts for resume screening software, candidate comparison and candidate evaluation templates returned predominantly unrelated results, including domain-filtered searches. Direct Google HTTP returned a JavaScript interstitial, not a usable SERP. No defensible Google rankings, search volumes, difficulty scores or low-competition claim was obtained. The page map below is a product-fit hypothesis, not validated search-demand data. This research requirement remains open; do not describe this pass as a completed SERP study.

Competitor primary pages inspected:
- https://www.greenhouse.com/ — broad recruiting platform with talent matching, structured hiring, interviewing and human-judgment messaging. Human control alone is not a unique category claim.
- https://www.manatal.com/ — broad AI recruitment platform with sourcing and pipeline positioning and a trial CTA. RecruitOS should not imply matching its feature breadth.

These are competitor positioning observations, not evidence they rank for a query. Initial emphasis: concrete role evidence and a usable worksheet, paired with the real product's workflow and free early access. No invented integrations, testimonials, statistics, guarantees or feature parity.

## Priorities and keyword-to-page map
| Owner/path | Primary intent/query hypothesis | Supporting intent | Priority and rationale |
|---|---|---|---|
| RecruitOS / | Commercial: recruiting software for resume and candidate review; RecruitOS brand | jobs/candidates workspace | P0: existing conversion entry, strong product fit, low implementation cost |
| /resume-analysis | Problem/commercial: analyze resumes against job description; resume analysis for recruiters | strengths, gaps, evidence | P1: exact supported workflow, actionable example, direct trial path |
| /compare-candidates | Problem/commercial: candidate comparison; compare candidates for a role | shortlist evidence | P1: distinct multi-candidate task, worked example, direct trial path |
| /guides/candidate-evaluation-template | Informational/task: candidate evaluation template | evidence worksheet, follow-up questions | P1: usable without signup; downloadable CSV; assists review before conversion |
| /analytics-privacy | Trust/navigation | consent and data boundaries | Technical completeness, not acquisition targeting |
| OperationOS / and /about | Brand/company: OperationOS | company purpose, product standards | Parent brand ownership |
| OperationOS /recruitos | Navigational: RecruitOS by OperationOS | portfolio overview and product links | Retain overview; avoid additional task-keyword landing pages here |
| OperationOS /blog/ai-resume-screening | Existing informational: how AI resume screening works | limitations and human review | Preserve URL pending GSC evidence; link to practical product pages |

Ranking opportunity remains unmeasured. Do not interpret P1 as easy to rank. No separate synonyms such as /cv-analysis, /resume-screening-tool and /ai-resume-analyzer competing for the same task. No generic “best ATS” or competitor-alternative pages.

## Changes
- Public metadata helper pins canonical/social origins to the product's production host, independent of Preview environment URLs.
- Explicit allowlisted sitemap contains only public canonical pages, no account, private job, candidate, checkout or dynamic record URLs.
- Robots permits public crawling, advertises sitemap and discourages API/auth crawling. Robots is not access control.
- X-Robots-Tag noindex/nofollow for account, dashboard, checkout, upload, API/auth routes. Dashboard auth remains intact. Dashboard/account crawling is not disallowed, so crawlers can observe noindex.
- /recruitos permanently redirects to /. No product routes otherwise changed.
- SoftwareApplication and WebSite on homepage; BreadcrumbList on new pages. Free offer explicitly says early access. No fabricated ratings/reviews. Valid schema does not guarantee a Google software rich result.
- Three manually authored pages contain distinct workflows, fictional evidence examples, limitations and clear CTAs. Template CSV contains only a blank worksheet, no user data, macros or formulas.
- Homepage and footer link to all three pages; each new page links to the other two. OperationOS product overview and legacy guide link to the product resources. RecruitOS links back to OperationOS About.
- PostHog landing event expanded to reviewed public routes, with route allowlist preserved. Consent, DNT/GPC, property sanitization and disabled replay remain unchanged.
- New pages are server components and add no dependency, client interactive widget or large image. No measured CWV improvement is claimed; shared client JS remains around 178 kB and root layout remains dynamic.

## Search Console after production deployment
1. Add a Domain property for operationos.org. Copy Google's exact DNS TXT verification value into the domain's DNS zone and verify. This property covers RecruitOS's subdomain too. Do not invent a verification token.
2. Add URL-prefix properties https://operationos.org/ and https://recruitos.operationos.org/ for separate reporting if useful; verification may inherit from the Domain property.
3. Submit https://operationos.org/sitemap.xml and https://recruitos.operationos.org/sitemap.xml in the matching properties. Submit only after the relevant branch is approved and deployed to production.
4. Use URL Inspection / Test live URL on RecruitOS /, /resume-analysis, /compare-candidates and /guides/candidate-evaluation-template. Confirm HTTP 200, allowed indexing, rendered main copy and selected canonical. Request indexing once for the priority pages.
5. Inspect updated OperationOS /recruitos and /blog/ai-resume-screening. Check legacy RecruitOS /recruitos is a redirect, not a submitted URL.
6. Monitor Page indexing and sitemap status weekly. Investigate excluded/crawled-not-indexed URLs individually; do not request indexing repeatedly or create more pages to compensate.
7. In Performance / Search results use Web search, page and query dimensions, country and device filters. Separate branded queries (RecruitOS/OperationOS) from non-brand and compare equivalent periods. Start with actual impressions; do not treat zero early clicks as proof a topic is wrong.
8. Validate structured data with Schema.org Validator and Google's Rich Results Test. Missing software review/rating rich-result eligibility is not a reason to invent a rating.

## PostHog organic measurement
Use existing events: landing_page_viewed → signup_started → signup_completed → job_created → candidate_analysis_completed; compare candidate_comparison_completed as a separate activated-use signal. Filter environment=production and referring_domain in google.com/bing.com; break down landing_page. Google referrer without paid campaign labels is a practical proxy, not perfect organic classification. Do not put UTMs on internal SEO links. Do not capture search query strings, full URLs, candidate content or session replay.
Attribution is consented and first-touch; returning visitors may retain earlier attribution. Declines, DNT/GPC, blockers and the current restricted domain vocabulary reduce coverage. Country-specific Google hosts may fall into external. Search Console clicks will not equal PostHog visits. Keep GSC and PostHog aggregate reports separate; no user-level query join. OperationOS and RecruitOS do not have cross-domain identity stitching; existing parent outbound CTA events can be reviewed separately.
Manual acceptance: on a preview with correct existing PostHog configuration, decline and confirm no optional events; allow and confirm one landing event for a new page, route sanitization, preview label and normal signup/activation events. Recheck production separately after deployment. No claim that live ingestion was verified in this pass.

## 30 / 60 / 90 days — decisions from evidence
- First 30 days: validate indexing and consented events; capture a reliable Google SERP sample in target markets; export baseline GSC query/page data. Ask actual recruiters whether worksheet and examples resolve their task. Fix crawl or conversion friction before adding pages.
- By 60 days: inspect non-brand impressions by page. If a page earns relevant impressions but few clicks, assess SERP title/intent before editing. If visitors arrive but do not activate, inspect the signup/first-analysis funnel. Expand only unanswered questions supported by queries or recruiter feedback.
- By 90 days: consolidate pages only if query overlap and intent are genuinely duplicative; assess migration of the legacy OperationOS recruiting guide using clicks, links and indexing evidence. Migrate with one-to-one permanent redirect and updated internal links if justified, not a second copy. Seek relevant editorial mentions through a genuinely useful resource and real relationships, without paid link schemes or unsolicited automation.

## Deliberately rejected
Mass posts, thin programmatic role/location pages, doorway pages, ATS-pass promises, unsupported competitor reviews, “bias-free” claims, autonomous hiring language, fabricated rich-result ratings, invented keyword metrics, premature article migration, cross-domain identity tracking, and an auth/layout refactor solely for SEO.

## Verification scope
Both production builds, typechecks and tests pass. RecruitOS: 189 tests; lint has two pre-existing warnings in command-task-surface.tsx, no errors. OperationOS: 7 tests; lint/typecheck pass. Local production HTTP checks validated new pages, metadata, JSON-LD parsing, sitemap, robots, 308 redirect, account noindex and true 404. Original live homepages inspected with the browser. Local browser preview was blocked by this browser environment; responsive visual checks and live PostHog ingestion remain to be verified on a reachable deployment. Field CWV/Search Console data were unavailable. No main merge is authorized.
