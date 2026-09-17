'use client';
import posthog, { type PostHogConfig } from 'posthog-js';
import { acquisition, ATTRIBUTION_COOKIE, CONSENT_COOKIE, ANALYTICS_DAYS, events, safeAttribution, safeId, safeProperties, safePage, type AnalyticsEvent, type SafeProperties } from './schema';
let initialized = false;
let attribution: SafeProperties = {};
let currentUser: string | null = null;
let entry: SafeProperties | null = null;
export function readCookie(name: string) {
  return document.cookie.split('; ').find(value => value.startsWith(name + '='))?.slice(name.length + 1);
}
function cookie(name: string, value: string, days = ANALYTICS_DAYS) {
  document.cookie = `${name}=${value}; Path=/; Max-Age=${days * 86400}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
}
export function permitted() {
  return readCookie(CONSENT_COOKIE) === 'accepted' && navigator.doNotTrack !== '1' && !(navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl;
}
export const privacyConfig: Partial<PostHogConfig> = {
  autocapture: false, capture_pageview: false, capture_pageleave: false,
  capture_dead_clicks: false, rageclick: false, capture_heatmaps: false,
  capture_exceptions: false, capture_performance: false, disable_surveys: true,
  disable_session_recording: true, enable_recording_console_log: false,
  disable_external_dependency_loading: true, advanced_disable_flags: true,
  advanced_disable_decide: true, advanced_disable_feature_flags: true,
  advanced_disable_toolbar_metrics: true,
  mask_all_text: true, mask_all_element_attributes: true,
  session_recording: { maskAllInputs: true, maskTextSelector: '*', blockSelector: 'body' },
  save_referrer: false, save_campaign_params: false, store_google: false, ip: false, respect_dnt: true,
  disable_conversations: true, disable_product_tours: true, disable_web_experiments: true,
  persistence: 'localStorage', cross_subdomain_cookie: false,
  person_profiles: 'identified_only',
  before_send: payload => {
    if (!payload || !permitted()) return null;
    const isIdentity = payload.event === '$identify';
    if (!isIdentity && !(events as readonly string[]).includes(payload.event)) return null;
    const distinctId = payload.properties.distinct_id;
    if (!safeId(distinctId)) return null;
    const properties: Record<string, unknown> = {
      ...(isIdentity ? {} : safeProperties(payload.event as AnalyticsEvent, payload.properties)),
      token: process.env.NEXT_PUBLIC_POSTHOG_KEY, distinct_id: distinctId, $geoip_disable: true, $ip: null,
      $process_person_profile: isIdentity || payload.properties.auth_state === 'authenticated',
      $is_identified: isIdentity || payload.properties.auth_state === 'authenticated',
    };
    if (safeId(payload.properties.$session_id)) properties.$session_id = payload.properties.$session_id;
    if (isIdentity && safeId(payload.properties.$anon_distinct_id)) properties.$anon_distinct_id = payload.properties.$anon_distinct_id;
    // Do not retain SDK URL, referrer, DOM, exception or person-property defaults.
    return { uuid: payload.uuid, event: payload.event, timestamp: payload.timestamp, properties,
      ...(isIdentity ? { $set_once: safeAttribution(attribution) } : {}) };
  },
};
export function initializeAnalytics() {
  // Keep only reviewed labels in memory until the visitor opts in.
  entry ??= acquisition(location.href, document.referrer);
  if (!permitted()) return false;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || key === 'YOUR_POSTHOG_KEY' || process.env.NEXT_PUBLIC_POSTHOG_HOST !== 'https://us.i.posthog.com') return false;
  try {
    attribution = safeAttribution(JSON.parse(decodeURIComponent(readCookie(ATTRIBUTION_COOKIE) ?? '{}')));
    if (!Object.keys(attribution).length) {
      attribution = entry;
      cookie(ATTRIBUTION_COOKIE, encodeURIComponent(JSON.stringify(attribution)));
    }
    if (!initialized) {
      posthog.init(key, { ...privacyConfig, api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST, persistence_name: 'recruitos_launch_v1' });
      posthog.opt_in_capturing({ captureEventName: false });
      initialized = true;
    }
    return true;
  } catch { return false; }
}
export function identifyRecruiter(userId: string | null) {
  if (!initializeAnalytics()) return;
  try {
    const old = localStorage.getItem('recruitos_analytics_user');
    if (old && old !== userId) {
      posthog.reset(true);
      cookie(ATTRIBUTION_COOKIE, '', 0);
      attribution = {};
      entry = { landing_page: safePage(location.pathname), referring_domain: 'direct' };
      localStorage.removeItem('recruitos_workspace_visit');
      localStorage.removeItem('recruitos_comparisons');
    }
    currentUser = userId;
    if (userId && safeId(userId)) {
      posthog.identify(userId);
      localStorage.setItem('recruitos_analytics_user', userId);
    } else localStorage.removeItem('recruitos_analytics_user');
  } catch { /* Storage may be blocked. */ }
}
export function captureClient(event: AnalyticsEvent, properties: SafeProperties = {}) {
  if (!initializeAnalytics()) return false;
  try { posthog.capture(event, safeProperties(event, { ...attribution, ...properties, auth_state: currentUser ? 'authenticated' : 'anonymous', environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development' })); return true; } catch { return false; }
}
export function recordWorkspaceVisit() {
  if (!currentUser || !initializeAnalytics()) return;
  try {
    const now = Date.now();
    const previous = Number(localStorage.getItem('recruitos_workspace_visit') ?? 0);
    // One workspace event per 30-minute gap between observed visits, including across tabs.
    if (!previous || now - previous >= 30 * 60 * 1000) captureClient('workspace_visited', { return_visit: previous > 0 });
    localStorage.setItem('recruitos_workspace_visit', String(now));
  } catch { /* Do not manufacture repeated visits when storage is unavailable. */ }
}
export function setAnalyticsConsent(accept: boolean) {
  cookie(CONSENT_COOKIE, accept ? 'accepted' : 'declined');
  if (!accept) {
    if (initialized) { posthog.opt_out_capturing(); posthog.reset(true); }
    cookie(ATTRIBUTION_COOKIE, '', 0);
    try {
      for (const key of ['recruitos_analytics_user', 'recruitos_workspace_visit', 'recruitos_comparisons', 'ph_recruitos_launch_v1']) localStorage.removeItem(key);
    } catch { /* Optional storage can be blocked. */ }
    attribution = {};
  } else if (initialized) posthog.opt_in_capturing({ captureEventName: false });
  window.dispatchEvent(new Event('recruitos-analytics-consent'));
}
/** A server-validated comparison has actually rendered; prefetches do not count. */
export function recordComparison(viewKey: string, candidateCount: number, userId: string) {
  if (!/^[a-f0-9]{64}$/.test(viewKey) || candidateCount < 2 || !initializeAnalytics()) return;
  identifyRecruiter(userId);
  try {
    const keys: unknown = JSON.parse(localStorage.getItem('recruitos_comparisons') ?? '[]');
    const seen = Array.isArray(keys) ? keys.filter((key): key is string => typeof key === 'string' && /^[a-f0-9]{64}$/.test(key)).slice(-63) : [];
    if (seen.includes(viewKey)) return;
    if (captureClient('candidate_comparison_completed', { candidate_count: candidateCount })) localStorage.setItem('recruitos_comparisons', JSON.stringify([...seen, viewKey]));
  } catch { /* Avoid duplicate comparisons if storage is blocked. */ }
}
