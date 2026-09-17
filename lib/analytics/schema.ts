/** Every outbound property is rebuilt here. Never spread domain objects into analytics. */
export const CONSENT_COOKIE = 'recruitos_analytics_consent';
export const ATTRIBUTION_COOKIE = 'recruitos_attribution';
export const ANALYTICS_DAYS = 90;
export const events = ['landing_page_viewed', 'signup_started', 'signup_completed', 'job_created', 'resume_processed', 'candidate_analysis_completed', 'candidate_comparison_completed', 'command_completed', 'workspace_visited'] as const;
export type AnalyticsEvent = typeof events[number];
export type SafeProperties = Record<string, string | number | boolean>;
// Deliberate vocabulary: URL parameters are untrusted and may contain candidate PII.
// Add reviewed campaign labels here before distributing new links.
export const utmValues = {
  utm_source: ['linkedin', 'facebook', 'google', 'community', 'newsletter', 'bing'],
  utm_medium: ['outreach', 'community', 'social', 'organic', 'cpc', 'paid_social', 'email', 'referral'],
  utm_campaign: ['launch', 'recruitos-launch', 'launch-2026', 'founder-outreach', 'community-launch', 'google-search', 'preview-test'],
  utm_content: ['dm', 'post', 'comment', 'profile', 'group-post', 'ad-a', 'ad-b', 'text-link'],
  utm_term: ['recruiting-software', 'resume-screening', 'candidate-analysis', 'recruitos'],
} as const;
const domains = ['linkedin.com', 'facebook.com', 'google.com', 'bing.com', 't.co', 'reddit.com'];
const pages = ['/', '/recruitos', '/sign-up', '/sign-in', '/pricing', '/dashboard', '/upload', '/analytics-privacy', 'other'];
export function safePage(path: string) { return pages.includes(path) ? path : path.startsWith('/dashboard/') ? '/dashboard' : 'other'; }
export function safeId(value: unknown): value is string { return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value); }
export function safeAttribution(input: unknown): SafeProperties {
  const source = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const result: SafeProperties = {};
  for (const key of Object.keys(utmValues) as (keyof typeof utmValues)[]) {
    const value = source[key];
    if (typeof value === 'string' && (utmValues[key] as readonly string[]).includes(value)) result[key] = value;
  }
  if (typeof source.referring_domain === 'string' && [...domains, 'direct', 'external'].includes(source.referring_domain)) result.referring_domain = source.referring_domain;
  if (typeof source.landing_page === 'string' && pages.includes(source.landing_page)) result.landing_page = source.landing_page;
  return result;
}
export function acquisition(url: string, referrer: string): SafeProperties {
  try {
    const parsed = new URL(url);
    const raw: Record<string, string> = { landing_page: safePage(parsed.pathname), referring_domain: 'direct' };
    for (const key of Object.keys(utmValues)) raw[key] = parsed.searchParams.get(key)?.toLowerCase() ?? '';
    if (referrer) {
      const host = new URL(referrer).hostname;
      if (host !== parsed.hostname) raw.referring_domain = domains.find(domain => host === domain || host.endsWith('.' + domain)) ?? 'external';
    }
    return safeAttribution(raw);
  } catch { return {}; }
}
const eventFields: Record<AnalyticsEvent, readonly string[]> = {
  landing_page_viewed: [], signup_started: [], signup_completed: ['confirmation_required'],
  job_created: ['job_count'], resume_processed: ['resume_count', 'profile_created'],
  candidate_analysis_completed: ['analysis_count'], candidate_comparison_completed: ['candidate_count'],
  command_completed: ['command_type', 'candidate_count', 'partial'], workspace_visited: ['return_visit'],
};
const commands = ['shortlist', 'compare_candidates', 'show_concerns', 'show_overview', 'skill_focus', 'analytical_refocus', 'candidate_status_change'];
export function safeProperties(event: AnalyticsEvent, input: unknown): SafeProperties {
  const source = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const result = safeAttribution(source);
  for (const field of eventFields[event] ?? []) {
    const value = source[field];
    if (field.endsWith('_count') && typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 10000) result[field] = value;
    if (['confirmation_required', 'profile_created', 'partial', 'return_visit'].includes(field) && typeof value === 'boolean') result[field] = value;
    if (field === 'command_type' && typeof value === 'string' && commands.includes(value)) result[field] = value;
  }
  if (['anonymous', 'authenticated'].includes(String(source.auth_state))) result.auth_state = String(source.auth_state);
  if (['production', 'preview', 'development'].includes(String(source.environment))) result.environment = String(source.environment);
  return result;
}
