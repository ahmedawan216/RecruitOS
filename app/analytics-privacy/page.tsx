'use client';
import { useState } from 'react';
import { setAnalyticsConsent } from '@/lib/analytics/client';
export default function AnalyticsPrivacyPage() {
  const [message, setMessage] = useState('');
  return <main className="mx-auto max-w-2xl px-5 pb-20 pt-28 text-ink">
    <h1 className="font-display text-3xl font-semibold">Analytics privacy</h1>
    <p className="mt-6">RecruitOS uses optional PostHog analytics, hosted in the United States, to understand acquisition and completed product actions. Analytics starts only after you allow it. Declining does not affect recruiting features.</p>
    <p className="mt-4">We send reviewed campaign labels, a general landing-page category, known referring domains, counts, command categories, and a random visitor ID. After sign-in, your recruiter account ID connects these events. We do not send candidate details, resumes, filenames, job descriptions, command text, form contents, passwords, or analysis content. Session recording is disabled.</p>
    <p className="mt-4">Your choice and initial campaign attribution are stored in this browser for up to 90 days. Analytics identity and visit markers use browser storage. Clearing browser data or withdrawing consent breaks anonymous continuity. Do Not Track and Global Privacy Control are respected. Network requests to PostHog necessarily expose a network address in transit; we disable IP-based analytics enrichment.</p>
    <p className="mt-4">You can change your choice here. Withdrawal stops future collection and clears our browser analytics attribution and visit markers; it does not delete events already received by PostHog.</p>
    <div className="mt-6 flex gap-3"><button className="rounded border border-border px-4 py-2" onClick={() => { setAnalyticsConsent(false); setMessage('Analytics declined.'); }}>Decline analytics</button><button className="rounded bg-accent px-4 py-2 text-white" onClick={() => { setAnalyticsConsent(true); setMessage('Analytics allowed, subject to your browser privacy settings.'); }}>Allow analytics</button></div>
    <p className="mt-4" role="status">{message}</p>
  </main>;
}
