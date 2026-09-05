"use client";

import {
  useActionState,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  uploadResume,
  type UploadState,
} from "@/app/upload/actions";

import { analyzeResume } from "@/app/actions/analyze-resume";

const initialState: UploadState = {
  success: false,
};

type AnalyzePageProps = {
  jobId: string;
};

export default function RecruitOSAnalyzePage({
  jobId,
}: AnalyzePageProps) {
  const router = useRouter();

  const [state, formAction, isPending] =
    useActionState<
      UploadState,
      FormData
    >(
      uploadResume,
      initialState
    );

  const [isAnalyzing, setIsAnalyzing] =
    useState(false);

  const [analysisError, setAnalysisError] =
    useState<string | null>(null);

  async function handleAnalyze() {
    if (!state.resumeId) {
      setAnalysisError(
        "No resume was uploaded."
      );

      return;
    }

    if (!jobId) {
      setAnalysisError(
        "No job was selected."
      );

      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const result =
        await analyzeResume(
          state.resumeId,
          jobId
        );

      if (!result.success) {
        setAnalysisError(
          result.error ??
            "Analysis failed."
        );

        return;
      }

      router.push(
        `/dashboard/agents/recruitos/analyze/${state.resumeId}?jobId=${jobId}`
      );
    } catch (error) {
      console.error(
        "Analysis error:",
        error
      );

      setAnalysisError(
        "Something went wrong while analyzing the resume."
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <main className="min-h-screen bg-bg px-5 pb-20 pt-28 sm:px-8">
      <div className="mx-auto max-w-wrap">

        <Link
          href={`/dashboard/agents/recruitos/jobs/${jobId}`}
          className="mb-10 inline-flex items-center gap-2 text-[13px] text-ink-dim transition-colors hover:text-ink"
        >
          <span>←</span>
          Back to Job
        </Link>

        <div className="mb-12 max-w-[700px]">
          <p className="mb-4 font-mono text-[11px] tracking-[0.08em] text-accent">
            RECRUITOS / RESUME ANALYSIS
          </p>

          <h1 className="font-display text-[clamp(36px,5vw,64px)] font-semibold leading-[1.05] tracking-[-0.025em] text-ink">
            Analyze a candidate.
          </h1>

          <p className="mt-5 text-[15px] leading-[1.7] text-ink-dim">
            Upload a candidate&apos;s resume and RecruitOS
            will analyze their fit against the selected job.
          </p>
        </div>

        <section className="max-w-[720px]">

          {/* Selected job */}

          <div className="mb-5 rounded-xl border border-border p-6 sm:p-8">
            <p className="font-mono text-[11px] tracking-[0.08em] text-accent">
              SELECTED JOB
            </p>

            <h2 className="mt-3 font-display text-xl font-semibold text-ink">
              Job selected
            </h2>

            <p className="mt-3 text-sm text-ink-dim">
              Candidate analysis will be performed against
              this job.
            </p>
          </div>

          {/* Upload */}

          <div className="rounded-xl border border-border p-6 sm:p-8">

            <div className="mb-8">
              <p className="font-mono text-[11px] tracking-[0.08em] text-ink-dim">
                STEP 01
              </p>

              <h2 className="mt-3 font-display text-xl font-semibold text-ink">
                Upload resume
              </h2>

              <p className="mt-2 text-sm leading-[1.6] text-ink-dim">
                Upload a PDF resume to begin the analysis.
              </p>
            </div>

            <form action={formAction}>
              <input type="hidden" name="jobId" value={jobId} />
              <input
                type="file"
                name="resume"
                accept="application/pdf"
                required
                className="block w-full cursor-pointer rounded-lg border border-border bg-transparent px-4 py-3 text-sm text-ink file:mr-4 file:rounded-md file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:font-medium file:text-bg"
              />

              <button
                type="submit"
                disabled={isPending}
                className="mt-5 rounded-lg bg-ink px-5 py-3 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending
                  ? "Uploading..."
                  : "Upload resume"}
              </button>
            </form>

            {state.error && (
              <p
                role="alert"
                className="mt-5 text-sm text-red-400"
              >
                {state.error}
              </p>
            )}

            {state.candidateWarning && (
              <p
                role="status"
                className="mt-5 text-sm text-amber-300"
              >
                {state.candidateWarning}
              </p>
            )}

            {state.success && (
              <div className="mt-6 border-t border-border pt-6">
                <p className="text-sm text-ink">
                  Resume uploaded successfully.
                </p>

                <p className="mt-2 text-xs text-ink-dim">
                  The resume is ready for RecruitOS analysis.
                </p>
              </div>
            )}

          </div>

          {/* Analysis */}

          {state.success &&
            state.resumeId && (
              <div className="mt-5 rounded-xl border border-border p-6 sm:p-8">

                <div className="mb-8">
                  <p className="font-mono text-[11px] tracking-[0.08em] text-accent">
                    STEP 02
                  </p>

                  <h2 className="mt-3 font-display text-xl font-semibold text-ink">
                    Run RecruitOS
                  </h2>

                  <p className="mt-2 text-sm leading-[1.6] text-ink-dim">
                    RecruitOS will compare the resume against
                    the selected job description and generate
                    a structured hiring analysis.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="rounded-lg bg-accent px-5 py-3 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isAnalyzing
                    ? "RecruitOS is analyzing..."
                    : "Analyze with RecruitOS"}
                </button>

                {analysisError && (
                  <p
                    role="alert"
                    className="mt-5 text-sm text-red-400"
                  >
                    {analysisError}
                  </p>
                )}

              </div>
            )}

        </section>
      </div>
    </main>
  );
}
