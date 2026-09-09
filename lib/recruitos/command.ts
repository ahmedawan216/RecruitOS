import { z } from "zod";
import { executionResultSchema, rankedCandidateSchema, type ExecutionResult } from "@/lib/recruitos/result";

export { executionResultSchema, rankedCandidateSchema } from "@/lib/recruitos/result";
export type { ExecutionResult } from "@/lib/recruitos/result";

export const COMMAND_INTENT = "review_and_rank_candidates" as const;
export const STATUS_ACTION_INTENT = "propose_candidate_status_change" as const;
export const DEFAULT_RESULT_COUNT = 8;
export const MAX_RESULT_COUNT = 25;
export const MAX_STATUS_ACTION_COUNT = 8;

export const commandSubmissionSchema = z.object({
  commandText: z.string().trim().min(1).max(4000),
  jobId: z.string().uuid().nullable().optional(),
  idempotencyKey: z.string().uuid(),
});

export const followUpSubmissionSchema = z.object({
  commandText: z.string().trim().min(1).max(1000),
  idempotencyKey: z.string().uuid(),
});

export const reviewAndRankIntentSchema = z.object({
  intent: z.literal(COMMAND_INTENT),
  requestedCount: z.number().int().min(1).max(MAX_RESULT_COUNT),
  requestedJobText: z.string().trim().min(1).max(200).nullable(),
});

export const candidateStatusActionIntentSchema = z.object({
  intent: z.literal(STATUS_ACTION_INTENT),
  targetStatus: z.literal("interview"),
  selector: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("strongest"), count: z.number().int().min(1).max(MAX_STATUS_ACTION_COUNT) }),
    z.object({ kind: z.literal("candidate_name"), name: z.string().trim().min(2).max(160) }),
  ]),
});

export const followUpIntentSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("show_concerns") }),
  z.object({ intent: z.literal("compare_candidates"), count: z.number().int().min(2).max(8) }),
  z.object({ intent: z.literal("skill_focus"), focus: z.string().trim().min(1).max(120) }),
  z.object({ intent: z.literal("analytical_refocus"), focus: z.string().trim().min(1).max(120) }),
  z.object({ intent: z.literal("show_overview") }),
]);

export const progressEventSchema = z.object({
  id: z.number().int().nonnegative(),
  kind: z.enum(["status", "progress", "warning", "completed", "failed", "cancelled", "clarification"]),
  message: z.string().min(1).max(500),
  data: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string(),
});

export type ReviewAndRankIntent = z.infer<typeof reviewAndRankIntentSchema>;
export type CandidateStatusActionIntent = z.infer<typeof candidateStatusActionIntentSchema>;
export type FollowUpIntent = z.infer<typeof followUpIntentSchema>;

export type CommandParseResult =
  | { ok: true; value: ReviewAndRankIntent }
  | { ok: false; code: "UNSUPPORTED_COMMAND" | "CONSEQUENTIAL_ACTION" | "INVALID_RESULT_COUNT"; message: string };

export type CandidateStatusActionParseResult =
  | { ok: true; value: CandidateStatusActionIntent }
  | { ok: false; code: "NOT_STATUS_ACTION" | "UNSUPPORTED_ACTION" | "INVALID_ACTION_COUNT" | "AMBIGUOUS_ACTION"; message: string };

export type FollowUpParseResult =
  | { ok: true; value: FollowUpIntent; requiresSemanticAnalysis: boolean }
  | { ok: false; code: "UNSUPPORTED_FOLLOW_UP" | "CONSEQUENTIAL_ACTION" | "AMBIGUOUS_COMPARISON"; message: string };

export type JobReference = { id: string; title: string };
export type JobResolution =
  | { status: "resolved"; job: JobReference }
  | { status: "not_found" }
  | { status: "ambiguous"; jobs: JobReference[] }
  | { status: "scope_conflict"; job: JobReference };

export const consequentialPattern = /\b(reject|hire|advance|promote|email|contact|message|call|schedule|delete|publish|offer|move\s+(?:them|candidates|applicants)|send\s+(?:an\s+|the\s+)?email|change\s+(?:their\s+)?status|make\s+(?:an\s+)?offer)\b/i;
const workPattern = /\b(review|find|prepare|rank|compare|shortlist)\b/i;
const subjectPattern = /\b(candidate|candidates|applicant|applicants|shortlist)\b/i;

export function normalizeJobTitle(value: string) {
  return value.toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function extractRequestedCount(text: string): number | null | "invalid" {
  const patterns = [/\b(?:top|best|strongest)\s+(\d{1,3})\b/i, /\bshortlist(?:\s+of)?\s+(\d{1,3})\b/i, /\b(\d{1,3})\s+(?:candidates|applicants)\b/i];
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
  if (!commandText) return { ok: false, code: "UNSUPPORTED_COMMAND", message: "Describe the recruiting review you want RecruitOS to prepare." };
  if (consequentialPattern.test(commandText)) return { ok: false, code: "CONSEQUENTIAL_ACTION", message: "RecruitOS can analyze recruiting evidence here, but consequential candidate actions require an active reviewed recruiting task." };
  if (!workPattern.test(commandText) || !subjectPattern.test(commandText)) return { ok: false, code: "UNSUPPORTED_COMMAND", message: "This workspace currently supports reviewing and ranking applicants for a job." };
  const requestedCount = extractRequestedCount(commandText);
  if (requestedCount === "invalid") return { ok: false, code: "INVALID_RESULT_COUNT", message: `Choose between 1 and ${MAX_RESULT_COUNT} candidates for the shortlist.` };
  const value = { intent: COMMAND_INTENT, requestedCount: requestedCount ?? DEFAULT_RESULT_COUNT, requestedJobText: extractRequestedJobText(commandText) } as const;
  const validation = reviewAndRankIntentSchema.safeParse(value);
  return validation.success ? { ok: true, value: validation.data } : { ok: false, code: "UNSUPPORTED_COMMAND", message: "RecruitOS could not safely interpret that command." };
}

function cleanCandidateName(value: string) {
  return value.replace(/[?.!]+$/g, "").replace(/\s+/g, " ").trim().slice(0, 160);
}

export function parseCandidateStatusActionCommand(text: string): CandidateStatusActionParseResult {
  const commandText = text.trim();
  if (!commandText) return { ok: false, code: "NOT_STATUS_ACTION", message: "" };

  const looksConsequential = /\b(move|advance|reject|hire|offer|promote|change\s+(?:their\s+)?status)\b/i.test(commandText);
  if (!looksConsequential) return { ok: false, code: "NOT_STATUS_ACTION", message: "" };

  const explicitlyDifferentTarget = commandText.match(/\b(?:to|into)\s+(new|reviewing|shortlisted|offer|hired|rejected)\b/i);
  if (explicitlyDifferentTarget || /\b(reject|hire|offer|promote)\b/i.test(commandText)) {
    return { ok: false, code: "UNSUPPORTED_ACTION", message: "Phase 2E currently supports only human-reviewed moves to Interview. Other consequential recruiting actions remain unavailable." };
  }

  const interviewTarget = /\b(?:to|into)\s+interview\b/i.test(commandText);
  const advanceVerb = /\badvance\b/i.test(commandText);
  if (!interviewTarget && !advanceVerb) {
    return { ok: false, code: "AMBIGUOUS_ACTION", message: "Specify the supported destination explicitly, for example: Move the strongest 3 candidates to interview." };
  }

  const strongestMatch = commandText.match(/\b(?:the\s+)?(?:strongest|top|best)(?:\s+(\d{1,2}))?\s+(?:candidate|candidates|applicant|applicants)\b/i);
  if (strongestMatch) {
    const count = strongestMatch[1] ? Number(strongestMatch[1]) : 1;
    if (!Number.isInteger(count) || count < 1 || count > MAX_STATUS_ACTION_COUNT) {
      return { ok: false, code: "INVALID_ACTION_COUNT", message: `Choose between 1 and ${MAX_STATUS_ACTION_COUNT} candidates for a reviewed status change.` };
    }
    return { ok: true, value: { intent: STATUS_ACTION_INTENT, targetStatus: "interview", selector: { kind: "strongest", count } } };
  }

  const explicitName = commandText.match(/\b(?:move|advance)\s+(.+?)\s+(?:to|into)\s+interview\b/i);
  if (explicitName?.[1]) {
    const name = cleanCandidateName(explicitName[1].replace(/^(?:candidate|applicant)\s+/i, ""));
    if (name.length >= 2) return { ok: true, value: { intent: STATUS_ACTION_INTENT, targetStatus: "interview", selector: { kind: "candidate_name", name } } };
  }

  return { ok: false, code: "AMBIGUOUS_ACTION", message: "RecruitOS could not identify the exact candidate scope. Use the strongest/top N candidates or an exact candidate name from the current task." };
}

function cleanFocus(value: string) {
  return value.replace(/[?.!]+$/g, "").replace(/^(?:the\s+)?(?:best|strongest)\s+/i, "").trim().slice(0, 120);
}

export function parseFollowUpCommand(text: string): FollowUpParseResult {
  const commandText = text.trim();
  if (!commandText) return { ok: false, code: "UNSUPPORTED_FOLLOW_UP", message: "Describe how you want to focus the current recruiting result." };
  if (consequentialPattern.test(commandText)) return { ok: false, code: "CONSEQUENTIAL_ACTION", message: "Consequential recruiting requests must go through RecruitOS's reviewed proposal flow. Unsupported actions remain blocked." };
  if (/\b(back to overview|show (?:the )?full shortlist|show all candidate details|full overview|overview)\b/i.test(commandText)) return { ok: true, value: { intent: "show_overview" }, requiresSemanticAnalysis: false };
  if (/\b(concerns?|gaps?)\b/i.test(commandText) && /\b(show|only|biggest|what|list|focus)\b/i.test(commandText)) return { ok: true, value: { intent: "show_concerns" }, requiresSemanticAnalysis: false };
  if (/\bcompare\b/i.test(commandText)) {
    const explicit = commandText.match(/\b(?:top|first|strongest)?\s*(\d+)\b/i)?.[1];
    const firstTwo = /\b(first|top)\s+two\b/i.test(commandText);
    const strongest = /\bstrongest candidates?\b/i.test(commandText);
    const count = explicit ? Number(explicit) : firstTwo ? 2 : strongest ? 3 : null;
    if (!count || count < 2 || count > 8) return { ok: false, code: "AMBIGUOUS_COMPARISON", message: "Choose between 2 and 8 candidates to compare, for example: Compare the top 3." };
    return { ok: true, value: { intent: "compare_candidates", count }, requiresSemanticAnalysis: false };
  }
  const prioritize = commandText.match(/\b(?:focus more on|prioritize|put more emphasis on|emphasize)\s+(.+)/i);
  if (prioritize?.[1]) {
    const focus = cleanFocus(prioritize[1]);
    if (focus) return { ok: true, value: { intent: "analytical_refocus", focus }, requiresSemanticAnalysis: true };
  }
  const skill = commandText.match(/\b(?:which candidates? have the strongest|who has the strongest|show me candidates? with the best|show candidates? with the best|focus on)\s+(.+?)(?:\s+experience)?[?.!]*$/i);
  if (skill?.[1]) {
    const focus = cleanFocus(skill[1]);
    if (focus) return { ok: true, value: { intent: "skill_focus", focus }, requiresSemanticAnalysis: true };
  }
  return { ok: false, code: "UNSUPPORTED_FOLLOW_UP", message: "Supported follow-ups can show concerns, compare 2–8 current candidates, focus on evidence for a skill, analytically refocus the current ranking, return to the overview, or prepare a human-reviewed move to Interview." };
}

export function resolveJobReference(jobs: JobReference[], requestedJobText: string | null, scopeJobId?: string | null): JobResolution {
  if (scopeJobId) {
    const scoped = jobs.find((job) => job.id === scopeJobId);
    if (!scoped) return { status: "not_found" };
    if (requestedJobText) {
      const requested = normalizeJobTitle(requestedJobText);
      const scopedTitle = normalizeJobTitle(scoped.title);
      if (requested && requested !== scopedTitle && !scopedTitle.includes(requested) && !requested.includes(scopedTitle)) return { status: "scope_conflict", job: scoped };
    }
    return { status: "resolved", job: scoped };
  }
  if (!requestedJobText) return { status: "not_found" };
  const requested = normalizeJobTitle(requestedJobText);
  if (!requested) return { status: "not_found" };
  const exact = jobs.filter((job) => normalizeJobTitle(job.title) === requested);
  if (exact.length === 1) return { status: "resolved", job: exact[0]! };
  if (exact.length > 1) return { status: "ambiguous", jobs: exact };
  const safePartial = jobs.filter((job) => { const title = normalizeJobTitle(job.title); return title.includes(requested) || requested.includes(title); });
  if (safePartial.length === 1) return { status: "resolved", job: safePartial[0]! };
  if (safePartial.length > 1) return { status: "ambiguous", jobs: safePartial };
  return { status: "not_found" };
}

export function isTerminalExecutionStatus(status: string) { return ["completed", "failed", "cancelled", "clarification_required"].includes(status); }
export function canCancelExecution(status: string) { return ["queued", "running"].includes(status); }

void executionResultSchema;
void rankedCandidateSchema;
void (null as unknown as ExecutionResult);
