import 'server-only';
import { cookies, headers } from 'next/headers';
import { after } from 'next/server';
import { createHash } from 'node:crypto';
import { ATTRIBUTION_COOKIE, CONSENT_COOKIE, events, safeAttribution, safeId, safeProperties, type AnalyticsEvent, type SafeProperties } from './schema';

/** Best-effort telemetry must never change the outcome of a recruiting operation. */
export async function captureOutcome(userId: string, event: AnalyticsEvent, properties: SafeProperties = {}, operationKey?: string) {
  try {
    if (!(events as readonly string[]).includes(event)) return;
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
    if (!key || key === 'YOUR_POSTHOG_KEY' || host !== 'https://us.i.posthog.com' || !safeId(userId)) return;
    const jar = await cookies();
    const requestHeaders = await headers();
    if (jar.get(CONSENT_COOKIE)?.value !== 'accepted' || requestHeaders.get('sec-gpc') === '1' || requestHeaders.get('dnt') === '1') return;
    let attribution = {};
    try { attribution = safeAttribution(JSON.parse(decodeURIComponent(jar.get(ATTRIBUTION_COOKIE)?.value ?? '{}'))); } catch { /* Ignore malformed/untrusted cookies. */ }
    const safe = safeProperties(event, { ...attribution, ...properties, auth_state: 'authenticated', environment: process.env.VERCEL_ENV ?? 'development' });
    const digest = operationKey ? createHash('sha256').update(`${userId}:${event}:${operationKey}`).digest('hex') : null;
    const uuid = digest ? `${digest.slice(0, 8)}-${digest.slice(8, 12)}-5${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}` : undefined;
    const body = JSON.stringify({
      ...(uuid ? { uuid } : {}),
      api_key: key, distinct_id: userId, event, timestamp: new Date().toISOString(),
      properties: { ...safe, distinct_id: userId, $is_identified: true, $process_person_profile: true, $geoip_disable: true, $ip: null,
        $set_once: attribution,
      },
    });
    // Official Capture API, bounded and scheduled after the response (Next.js 15).
    after(async () => {
      try {
        const response = await fetch(`${host}/i/v0/e/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, cache: 'no-store', signal: AbortSignal.timeout(2000) });
        if (!response.ok) console.warn('RecruitOS analytics delivery failed');
      } catch { console.warn('RecruitOS analytics delivery failed'); }
    });
  } catch { /* Disabled, expired context, or unavailable telemetry must not fail user work. */ }
}
