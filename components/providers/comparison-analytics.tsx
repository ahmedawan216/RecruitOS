'use client';
import { useEffect } from 'react';
import { recordComparison } from '@/lib/analytics/client';
export function ComparisonAnalytics({ viewKey, candidateCount, userId }: { viewKey: string; candidateCount: number; userId: string }) {
  useEffect(() => {
    const capture = () => recordComparison(viewKey, candidateCount, userId);
    capture();
    window.addEventListener('recruitos-analytics-consent', capture);
    return () => window.removeEventListener('recruitos-analytics-consent', capture);
  }, [viewKey, candidateCount, userId]);
  return null;
}
