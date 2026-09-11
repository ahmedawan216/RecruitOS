# RecruitOS Paddle Billing Foundation

Phase 3C uses Paddle Billing **Sandbox only**. It does not enforce usage limits; capacity enforcement belongs to Phase 3D.

## Plans and price mapping

The product plan catalog remains authoritative in `lib/recruitos/commercial.ts`:

- Free: $0 forever, no Paddle price.
- Standard: $39/month -> `PADDLE_STANDARD_PRICE_ID`.
- Pro: $69/month -> `PADDLE_PRO_PRICE_ID`.

The browser submits only `standard` or `pro` to the authenticated checkout-preparation endpoint. The server maps that internal plan to the configured Paddle price. Arbitrary client-supplied Paddle price IDs are never accepted.

## Checkout

`POST /api/recruitos/billing/checkout`:

1. Requires a same-origin request and authenticated Supabase user.
2. Validates the internal plan allowlist.
3. Resolves the configured Paddle price server-side.
4. Creates or reuses a Paddle Sandbox customer mapped to the authenticated RecruitOS user.
5. Returns only the approved price ID and that user's Paddle customer ID.
6. Paddle.js opens an overlay Sandbox checkout for exactly one approved recurring price.

A `checkout=complete` redirect is presentation-only. It never grants a paid RecruitOS plan.

## Authoritative subscription state

Paid access comes only from verified Paddle webhook state stored in Supabase. `getEffectiveUserPlan()` is server-only and checks both the stored internal plan and the current server-configured Paddle price mapping.

Paddle access policy:

- `active`: paid plan remains effective.
- `trialing`: paid plan remains effective defensively according to Paddle's access guidance, although RecruitOS configures no free trials.
- `past_due`: paid plan remains effective while Paddle performs payment recovery; Billing directs the user to Paddle's portal.
- `paused`: resolves to Free.
- `canceled`: resolves to Free.
- unknown status, unknown price, missing/mismatched billing state: resolves to Free.

A future scheduled cancellation does not revoke early while Paddle still reports the subscription as active. Access ends when Paddle reports `canceled`.

## Webhook flow

`POST /api/paddle/webhook` reads the raw request body and verifies `Paddle-Signature` with `@paddle/paddle-node-sdk` `webhooks.unmarshal()` before trusting payload data.

Enable these Sandbox notification events:

- `subscription.created`
- `subscription.updated`

Paddle recommends these two for a lean subscription cache; `subscription.updated` covers renewals, upgrades/downgrades, scheduled changes, pauses/resumes, past-due transitions, and cancellation state changes.

Verified normalized subscription state is passed to the service-role-only Postgres function `sync_recruitos_paddle_subscription_event`. The function:

- deduplicates on Paddle `event_id`,
- maps Paddle customer ID only through the server-created RecruitOS customer mapping,
- ignores out-of-order older events using `occurred_at`,
- persists unknown prices as non-entitling state rather than leaving an old paid entitlement active,
- updates the subscription cache and webhook ledger in one database transaction.

If the function fails, its transaction rolls back, including the event ledger insert. Returning HTTP 500 allows Paddle to retry safely. No raw webhook payload is stored.

## Customer portal

`POST /api/recruitos/billing/portal` requires the authenticated RecruitOS user and same-origin request, then creates a fresh Paddle customer portal session. Portal URLs are temporary and are never stored.

## Required environment variables

Public/intended for browser:

- `NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox`
- `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`

Server only:

- `PADDLE_ENVIRONMENT=sandbox`
- `PADDLE_API_KEY`
- `PADDLE_WEBHOOK_SECRET`
- `PADDLE_STANDARD_PRICE_ID`
- `PADDLE_PRO_PRICE_ID`

Existing Supabase server secrets remain server-only.

## Paddle Sandbox dashboard setup

Before end-to-end webhook testing:

1. In Paddle Sandbox, create a notification destination pointing to `https://<your-host>/api/paddle/webhook`.
2. Enable `subscription.created` and `subscription.updated`.
3. Copy that destination's endpoint secret privately into `PADDLE_WEBHOOK_SECRET` locally and in the Vercel environment. Never commit it.
4. Ensure the Sandbox API key has customer read/write plus customer portal session permissions required by the integration.
5. Configure a default payment link / approved checkout domain as required by Paddle Checkout.
6. Test Standard and Pro with Paddle Sandbox test payment details, then confirm the signed webhook changes the server-resolved plan.

## Going live later

Live activation is intentionally out of scope. It will require separate live Paddle products/prices, a live client token/API key/webhook secret, a live notification destination, domain/payment-link review, and an explicit environment switch. Do not reuse Sandbox credentials for live mode.
