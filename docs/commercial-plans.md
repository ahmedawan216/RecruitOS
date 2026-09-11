# RecruitOS Commercial Plans

RecruitOS launch plans are defined centrally in `lib/recruitos/commercial.ts`:

- **Free** — $0, entry plan.
- **Standard** — $39 USD/month, recommended commercial plan.
- **Pro** — $69 USD/month, higher-volume paid plan.

Core RecruitOS product capabilities remain available across all three plans. Commercial differentiation is intended to come primarily from capacity, volume, batch size, support, and operational convenience rather than artificial feature removal.

Numeric capacity limits are intentionally not locked yet. A `null` limit means no enforcement has been configured and must not block usage; it does not make a public promise of unlimited usage. Usage enforcement remains Phase 3D work.

The default effective user plan is **Free**. **Standard** is only the recommended commercial plan and must not be treated as the default entitlement.

Phase 3C integrates Paddle Billing Sandbox without creating a second plan catalog. Standard and Pro map to server-configured Paddle price IDs; Free has no Paddle product or price. The effective plan is resolved server-side from signed Paddle subscription webhook state stored in Supabase. Browser checkout completion, URL parameters, local storage, and client-submitted plan/price data are never entitlement authority.

See `docs/paddle-billing.md` for the billing architecture and Sandbox setup.
