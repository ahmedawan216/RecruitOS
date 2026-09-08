import { z } from "zod";

export const COMMAND_INTENT = "review_and_rank_candidates" as const;
export const DEFAULT_RESULT_COUNT = 8;
export const MAX_RESULT_COUNT = 25;

export const commandSubmissionSchema = z.object({
  commandText: z.string().trim().min(1).max(4000),
  jobId: z.string().uuid().nullable().optional(),
  idempotencyKey: z.string().uuid(),
});

export const reviewAndRankIntentSchema = z.object({
  intent: z.literal(COMMAND_INTENT),
  requestedCount: z.number().int().min(1).max(MAX_RESULT_COUNT),
  requestedJobText: z.string().trim().min(1).max(200).nullable(),
});

export const progressEventSchema = z.object({
  id: z.number().int().nonnegative(),
  kind: z.enum(["status", "progress", "warning", "completed", "failed", "cancelled", "clarification"]),
  message: z.string().min(1).max(500),
  data: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string(),
});

export const rankedCandidateSchema = z.object({
  rank: z.number().int().positive(),
  candidateId: z.string().uuid(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  matchScore: z.number().int().min(0).max(100),
  recommendation: z.enum(["interview", "maybe", "reject"]).nullable(),
  summary: z.string().nullable(),
  evidence: z.array(z.string()),
  strengths: z.array(z.string()),
  concerns: z.array(z.string()),
  missingSkills: z.array(z.string()),
  yearsRelevantExperience: z.number().nonnegative().nullable(),
  recruiterStatus: z.string().nullable(),
  candidateHref: z.string().startsWith("/dashboard/agents/recruitos/candidates/"),
});

export const executionResultSchema = z.object({
  kind: z.literal("candidate_shortlist"),
  job: z.object({ id: z.string().uuid(), title: z.string().min(1) }),
  requestedCount: z.number().int().min(1).max(MAX_RESULT_COUNT),
  consideredCount: z.number().int().nonnegative(),
  rankedCount: z.number().int().nonnegative(),
  reusedAnalysisCount: z.number().int().nonnegative(),
  generatedAnalysisCount: z.number().int().nonnegative(),
  analysisFailureCount: z.number().int().nonnegative(),
  partial: z.boolean(),
  candidates: z.array(rankedCandidateSchema),
});

export type ReviewAndRankIntent = z.infer<typeof reviewAndRankIntentSchema>;
export type ExecutionResult = z.infer<typeof executionResultSchema>;

export type CommandParseResult =
  | { ok: true; value: ReviewAndRankIntent }
  | { ok: false; code: "UNSUPPORTED_COMMAND" | "CONSEQUENTIAL_ACTION" | "INVALID_RESULT_COUNT"; message: string };

export type JobReference = { id: string; title: string };
export type JobResolution =
  | { status: "resolved"; job: JobReference }
  | { status: "not_found" }
  | { status: "ambiguous"; jobs: JobReference[] }
  | { status: "scope_conflict"; job: JobReference };

const consequentialPattern = /\b(reject|hire|advance|move\s+(?:them|candidates|applicants)|send\s+(?:an\s+|the\s+)?email|email\s+(?:them|candidates|applicants)|contact\s+(?:them|candidates|applicants)|delete|publish|change\s+(?:their\s+)?status|make\s+(?:an\s+)?offer)\b/i;
const workPattern = /\b(review|find|prepare|rank|compare|shortlist)\b/i;
const subjectPattern = /\b(candidate|candidates|applicant|applicants|shortlist)\b/i;

export function normalizeJobTitle(value: string) {
  return value
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function extractRequestedCount(text: string): number | null | "invalid" {
  const patterns = [
    /\b(?:top|best|strongest)\s+(\d{1,3})\b/i,
    /\bshortlist(?:\s+of)?\s+(\d{1,3})\b/i,
    /\b(\d{1,3})\s+(?:candidates|applicants)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const parsed = Number(match[1]);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_RESULT_COUNT) return "invalid";
    return parsed;
  }
  return null;
}

function extractRequestedJobText(text: string): string | null {
  const forMatch = text.match(/\bfor\s+(.+?)(?=\s+and\s+(?:prepare|give|show|rank|compare|shortlist)\b|[.!?]*$)/i);
  const reviewMatch = text.match(/\breview\s+(.+?)\s+(?:applicants|candidates)\b/i);
  const raw = forMatch?.[1] ?? reviewMatch?.[1];
  if (!raw) return null;
  const cleaned = raw.replace(/[.!?]+$/g, "").trim();
  return cleaned ? cleaned.slice(0, 200) : null;
}

export function parseRecruitingCommand(text: string): CommandParseResult {
  const commandText = text.trim();
  if (!commandText) {
    return { ok: false, code: "UNSUPPORTED_COMMAND", message: "Describe the recruiting review you want RecruitOS to prepare." };
  }

  if (consequentialPattern.test(commandText)) {
    return {
      ok: false,
      code: "CONSEQUENTIAL_ACTION",
      message: "Phase 2C can review, compare, rank, and prepare candidates, but it cannot change hiring status or contact candidates.",
    };
  }

  if (!workPattern.test(commandText) || !subjectPattern.test(commandText)) {
    return {
      ok: false,
      code: "UNSUPPORTED_COMMAND",
      message: "This workspace currently supports reviewing and ranking applicants for a job.",
    };
  }

  const requestedCount = extractRequestedCount(commandText);
  if (requestedCount === "invalid") {
    return {
      ok: false,
      code: "INVALID_RESULT_COUNT",
      message: `Choose between 1 and ${MAX_RESULT_COUNT} candidates for the shortlist.`,
    };
  }

  const value = {
    intent: COMMAND_INTENT,
    requestedCount: requestedCount ?? DEFAULT_RESULT_COUNT,
    requestedJobText: extractRequestedJobText(commandText),
  } as const;
  const validation = reviewAndRankIntentSchema.safeParse(value);
  if (!validation.success) {
    return { ok: false, code: "UNSUPPORTED_COMMAND", message: "RecruitOS could not safely interpret that command." };
  }
  return { ok: true, value: validation.data };
}

export function resolveJobReference(jobs: JobReference[], requestedJobText: string | null, scopeJobId?: string | null): JobResolution {
  if (scopeJobId) {
    const scoped = jobs.find((job) => job.id === scopeJobId);
    if (!scoped) return { status: "not_found" };
    if (requestedJobText) {
      const requested = normalizeJobTitle(requestedJobText);
      const scopedTitle = normalizeJobTitle(scoped.title);
      if (requested && requested !== scopedTitle && !scopedTitle.includes(requested) && !requested.includes(scopedTitle)) {
        return { status: "scope_conflict", job: scoped };
      }
    }
    return { status: "resolved", job: scoped };
  }

  if (!requestedJobText) return { status: "not_found" };
  const requested = normalizeJobTitle(requestedJobText);
  if (!requested) return { status: "not_found" };

  const exact = jobs.filter((job) => normalizeJobTitle(job.title) === requested);
  if (exact.length === 1) return { status: "resolved", job: exact[0] };
  if (exact.length > 1) return { status: "ambiguous", jobs: exact };

  const safePartial = jobs.filter((job) => {
    const title = normalizeJobTitle(job.title);
    return title.includes(requested) || requested.includes(title);
  });
  if (safePartial.length === 1) return { status: "resolved", job: safePartial[0] };
  if (safePartial.length > 1) return { status: "ambiguous", jobs: safePartial };
  return { status: "not_found" };
}

export function isTerminalExecutionStatus(status: string) {
  return ["completed", "failed", "cancelled", "clarification_required"].includes(status);
}

export function canCancelExecution(status: string) {
  return ["queued", "running"].includes(status);
}
