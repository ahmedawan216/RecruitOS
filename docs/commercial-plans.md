# RecruitOS Commercial Plans

RecruitOS launch plans are defined centrally in `lib/recruitos/commercial.ts`:

- **Free**: $0, entry plan.
- **Standard**: $39 USD/month, recommended commercial plan.
- **Pro**: $69 USD/month, higher-volume paid plan.

Core RecruitOS product capabilities remain available across all three plans. Plans differ by capacity rather than removing core recruiting workflows.

Phase 3D enforces only these capacities:

| Plan | Active jobs | Resume analyses |
| --- | ---: | ---: |
| Free | 1 | 2 per UTC calendar day |
| Standard | 25 | 300 per UTC calendar month |
| Pro | 100 | 1,000 per UTC calendar month |

Candidate volume, command executions, and batch-size commercial limits remain unconfigured and are not enforced by Phase 3D.

Active-job creation and reopening are enforced transactionally in Postgres against jobs owned by the authenticated user whose `lifecycle_status` is `open`. Resume-analysis capacity is reserved server-side after the requested resume and job are validated, before expensive analysis work begins. A small internal usage ledger plus per-user transaction locking prevents straightforward concurrent-request bypass and avoids double-counting the same resume/job retry within one usage window.

The default effective user plan remains **Free**. **Standard** is only the recommended commercial plan and must not be treated as the default entitlement.

Paddle Billing remains the authority for Standard and Pro entitlement. The effective plan is resolved server-side from signed Paddle subscription webhook state stored in Supabase. Browser checkout completion, URL parameters, local storage, and client-submitted plan, count, or user data are never entitlement authority.

Public plan comparison remains on https://operationos.org/pricing. RecruitOS only shows contextual upgrade guidance when a protected action reaches its configured capacity.

See `docs/paddle-billing.md` for the billing architecture and Sandbox setup.
