"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { uploadResume, type UploadState } from "@/app/upload/actions";
import { analyzeResume } from "@/app/actions/analyze-resume";

const initialState: UploadState = { success: false };

type AnalyzePageProps = { jobId: string };

export default function RecruitOSAnalyzePage({ jobId }: AnalyzePageProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<UploadState, FormData>(uploadResume, initialState);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!state.resumeId) { setAnalysisError("Upload a resume before starting analysis."); return; }
    if (!jobId) { setAnalysisError("Choose a job before starting analysis."); return; }
    setIsAnalyzing(true); setAnalysisError(null);
    try {
      const result = await analyzeResume(state.resumeId, jobId);
      if (!result.success) { setAnalysisError(result.error ?? "RecruitOS could not complete this analysis."); return; }
      router.push(`/dashboard/agents/recruitos/analyze/${state.resumeId}?jobId=${jobId}`);
    } catch (error) {
      console.error("Analysis error:", error);
      setAnalysisError("RecruitOS could not complete this analysis. Try again.");
    } finally { setIsAnalyzing(false); }
  }

  return <main className="min-h-screen bg-bg px-5 pb-20 pt-24 sm:px-8 sm:pt-28"><div className="mx-auto max-w-wrap"><Link href={`/dashboard/agents/recruitos/jobs/${jobId}`} className="product-link mb-6 -ml-2">← Job</Link><header className="mb-8 max-w-[720px]"><p className="product-kicker">Resume analysis</p><h1 className="mt-4 font-display text-[clamp(34px,5vw,56px)] font-semibold leading-[1.05] tracking-[-0.035em] text-ink">Analyze a candidate for this role.</h1><p className="mt-4 text-[15px] leading-7 text-ink-dim">Upload a PDF resume, then run the existing RecruitOS analysis against the selected job. The result is structured recruiting evidence, not an automated hiring decision.</p></header><section className="max-w-[760px] space-y-4"><div className="product-surface p-6 sm:p-7"><p className="product-kicker">Step 1</p><h2 className="mt-3 font-display text-xl font-semibold text-ink">Upload candidate resume</h2><p className="mt-2 text-sm leading-6 text-ink-dim">PDF only. RecruitOS will attach the resume to the selected job context.</p><form action={formAction} className="mt-6"><input type="hidden" name="jobId" value={jobId} /><input type="file" name="resume" accept="application/pdf" required className="block w-full cursor-pointer rounded-lg border border-border bg-bg px-4 py-3 text-sm text-ink file:mr-4 file:rounded-md file:border-0 file:bg-surface-2 file:px-4 file:py-2 file:text-sm file:font-medium file:text-ink" /><button type="submit" disabled={isPending} className="workspace-action mt-5">{isPending ? "Uploading resume..." : "Upload resume"}</button></form>{state.error ? <div role="alert" className="mt-5 rounded-lg border border-danger/25 bg-danger/[0.05] px-4 py-3 text-sm text-danger">{state.error}</div> : null}{state.candidateWarning ? <div role="status" className="mt-5 rounded-lg border border-warning/25 bg-warning/[0.07] px-4 py-3 text-sm text-warning">{state.candidateWarning}</div> : null}{state.success ? <div role="status" className="mt-5 rounded-lg border border-success/25 bg-success/[0.05] px-4 py-3 text-sm text-success">Resume uploaded. It is ready for analysis.</div> : null}</div>{state.success && state.resumeId ? <div className="product-surface p-6 sm:p-7"><p className="product-kicker">Step 2</p><h2 className="mt-3 font-display text-xl font-semibold text-ink">Run RecruitOS analysis</h2><p className="mt-2 text-sm leading-6 text-ink-dim">RecruitOS will compare the resume with the selected role and return strengths, gaps, concerns, evidence, and a stored match score.</p><button type="button" onClick={handleAnalyze} disabled={isAnalyzing} className="workspace-action mt-6">{isAnalyzing ? "Analyzing candidate..." : "Analyze candidate"}</button>{isAnalyzing ? <p role="status" className="mt-3 text-xs text-ink-dim">RecruitOS is running the real candidate analysis now.</p> : null}{analysisError ? <div role="alert" className="mt-5 rounded-lg border border-danger/25 bg-danger/[0.05] px-4 py-3 text-sm text-danger">{analysisError}</div> : null}</div> : null}</section></div></main>;
}
