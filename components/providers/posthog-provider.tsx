'use client';
import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { acquisitionPaths } from '@/lib/seo';
import { CONSENT_COOKIE } from '@/lib/analytics/schema';
import { captureClient, identifyRecruiter, readCookie, recordWorkspaceVisit, setAnalyticsConsent } from '@/lib/analytics/client';

export function PostHogProvider({ children, userId = null }: { children: React.ReactNode; userId?: string | null }) {
  const lastPage = useRef<string | null>(null);
  const pathname = usePathname();
  const [choice, setChoice] = useState<string | undefined>('loading');
  useEffect(() => {
    const sync = () => setChoice(readCookie(CONSENT_COOKIE));
    sync();
    window.addEventListener('recruitos-analytics-consent', sync);
    return () => window.removeEventListener('recruitos-analytics-consent', sync);
  }, []);
  useEffect(() => {
    if (choice !== 'accepted') { lastPage.current = null; return; }
    identifyRecruiter(userId);
    if (lastPage.current !== pathname && ((acquisitionPaths as readonly string[]).includes(pathname) || pathname === '/recruitos')) captureClient('landing_page_viewed');
    lastPage.current = pathname;
    const visit = () => { if (userId && pathname.startsWith('/dashboard') && document.visibilityState === 'visible') recordWorkspaceVisit(); };
    visit();
    window.addEventListener('focus', visit);
    return () => window.removeEventListener('focus', visit);
  }, [pathname, choice, userId]);
  return <>{children}{choice === undefined ? <aside aria-label="Analytics preferences" className="fixed bottom-4 left-4 z-[200] max-w-sm rounded-lg border border-border bg-surface p-4 text-sm text-ink shadow-workspace">
    <p>Allow optional analytics to help improve RecruitOS? We measure visits and completed actions without candidate content. Session recording is disabled.</p>
    <a className="mt-2 inline-block text-accent underline" href="/analytics-privacy">Analytics privacy</a>
    <div className="mt-3 flex gap-3"><button className="rounded border border-border px-3 py-2" onClick={() => setAnalyticsConsent(false)}>Decline</button><button className="rounded bg-accent px-3 py-2 text-white" onClick={() => setAnalyticsConsent(true)}>Allow analytics</button></div>
  </aside> : null}</>;
}
