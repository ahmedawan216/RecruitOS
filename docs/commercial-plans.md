# RecruitOS Commercial Plans

RecruitOS launch plans are defined centrally in `lib/recruitos/commercial.ts`:

- **Free** — $0, entry plan.
- **Standard** — $39 USD/month, recommended commercial plan.
- **Pro** — $69 USD/month, higher-volume paid plan.

Core RecruitOS product capabilities remain available across all three plans. Commercial differentiation is intended to come primarily from capacity, volume, batch size, support, and operational convenience rather than artificial feature removal.

Numeric capacity limits are intentionally not locked yet. A `null` limit means no enforcement has been configured and must not block usage; it does not make a public promise of unlimited usage.

The default effective user plan is **Free**. **Standard** is only the recommended commercial plan and must not be treated as the default entitlement.

Stripe and provider-specific billing state are not implemented in Phase 3A. Future billing work must consume this centralized plan model and provide a server-authoritative paid-plan source rather than duplicating plan definitions or trusting client-submitted plan values.
