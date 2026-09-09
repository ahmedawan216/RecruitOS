import { z } from "zod";

export const jobResultSchema = z.object({ id: z.string().uuid(), title: z.string().min(1) });

export const recruiterStatusSchema = z.enum(["new", "reviewing", "shortlisted", "interview", "offer", "hired", "rejected"]);
export type RecruiterStatus = z.infer<typeof recruiterStatusSchema>;

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

export const shortlistResultSchema = z.object({
  kind: z.literal("candidate_shortlist"),
  job: jobResultSchema,
  requestedCount: z.number().int().min(1).max(25),
  consideredCount: z.number().int().nonnegative(),
  rankedCount: z.number().int().nonnegative(),
  reusedAnalysisCount: z.number().int().nonnegative(),
  generatedAnalysisCount: z.number().int().nonnegative(),
  analysisFailureCount: z.number().int().nonnegative(),
  partial: z.boolean(),
  candidates: z.array(rankedCandidateSchema),
});

const scopedCandidateIdentitySchema = z.object({
  candidateId: z.string().uuid(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  matchScore: z.number().int().min(0).max(100),
  recruiterStatus: z.string().nullable(),
  candidateHref: z.string().startsWith("/dashboard/agents/recruitos/candidates/"),
});

export const concernsResultSchema = z.object({
  kind: z.literal("candidate_concerns"),
  job: jobResultSchema,
  candidateSetCount: z.number().int().nonnegative(),
  candidates: z.array(scopedCandidateIdentitySchema.extend({
    rank: z.number().int().positive(),
    concerns: z.array(z.string()),
    missingSkills: z.array(z.string()),
    evidence: z.array(z.string()),
  })),
});

export const comparisonResultSchema = z.object({
  kind: z.literal("candidate_comparison"),
  job: jobResultSchema,
  sourceCandidateCount: z.number().int().nonnegative(),
  comparedCount: z.number().int().min(2).max(8),
  candidates: z.array(scopedCandidateIdentitySchema.extend({
    originalRank: z.number().int().positive(),
    summary: z.string().nullable(),
    evidence: z.array(z.string()),
    strengths: z.array(z.string()),
    concerns: z.array(z.string()),
    missingSkills: z.array(z.string()),
    yearsRelevantExperience: z.number().nonnegative().nullable(),
  })),
});

export const evidenceStrengthSchema = z.enum(["strong", "moderate", "limited", "none"]);

const semanticFocusedCandidateSchema = scopedCandidateIdentitySchema.extend({
  originalRank: z.number().int().positive(),
  relevanceScore: z.number().int().min(0).max(100),
  evidenceStrength: evidenceStrengthSchema,
  relevantEvidence: z.array(z.string()),
  uncertainty: z.string().nullable(),
});

export const skillFocusResultSchema = z.object({
  kind: z.literal("candidate_skill_focus"),
  job: jobResultSchema,
  focus: z.string().min(1).max(120),
  candidateSetCount: z.number().int().nonnegative(),
  insufficientEvidence: z.boolean(),
  candidates: z.array(semanticFocusedCandidateSchema.extend({ rank: z.number().int().positive() })),
});

export const refocusResultSchema = z.object({
  kind: z.literal("candidate_refocus"),
  job: jobResultSchema,
  focus: z.string().min(1).max(120),
  candidateSetCount: z.number().int().nonnegative(),
  insufficientEvidence: z.boolean(),
  candidates: z.array(semanticFocusedCandidateSchema.extend({
    focusRank: z.number().int().positive(),
    movement: z.number().int(),
  })),
});

export const candidateStatusProposalItemSchema = z.object({
  candidateId: z.string().uuid(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  candidateHref: z.string().startsWith("/dashboard/agents/recruitos/candidates/"),
  matchScore: z.number().int().min(0).max(100).nullable(),
  sourceRank: z.number().int().positive().nullable(),
  expectedStatus: recruiterStatusSchema,
  proposedStatus: z.literal("interview"),
  currentStatus: recruiterStatusSchema.nullable(),
  state: z.enum(["pending", "stale"]),
  conflictReason: z.string().max(300).nullable(),
});

export const candidateStatusSkippedItemSchema = z.object({
  candidateId: z.string().uuid(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  candidateHref: z.string().startsWith("/dashboard/agents/recruitos/candidates/"),
  currentStatus: recruiterStatusSchema,
  reason: z.string().min(1).max(300),
});

export const candidateStatusProposalResultSchema = z.object({
  kind: z.literal("candidate_status_proposal"),
  job: jobResultSchema,
  proposalId: z.string().uuid(),
  proposalStatus: z.enum(["pending", "stale"]),
  requestedCommand: z.string().min(1).max(1000),
  proposedStatus: z.literal("interview"),
  createdAt: z.string(),
  changeCount: z.number().int().min(1).max(8),
  candidates: z.array(candidateStatusProposalItemSchema).min(1).max(8),
  skipped: z.array(candidateStatusSkippedItemSchema).max(25),
});

export const candidateStatusAppliedResultSchema = z.object({
  kind: z.literal("candidate_status_action_result"),
  job: jobResultSchema,
  proposalId: z.string().uuid(),
  appliedAt: z.string(),
  appliedCount: z.number().int().min(1).max(8),
  candidates: z.array(z.object({
    candidateId: z.string().uuid(),
    name: z.string().nullable(),
    email: z.string().nullable(),
    candidateHref: z.string().startsWith("/dashboard/agents/recruitos/candidates/"),
    previousStatus: recruiterStatusSchema,
    newStatus: z.literal("interview"),
  })).min(1).max(8),
});

export const executionResultSchema = z.discriminatedUnion("kind", [
  shortlistResultSchema,
  concernsResultSchema,
  comparisonResultSchema,
  skillFocusResultSchema,
  refocusResultSchema,
  candidateStatusProposalResultSchema,
  candidateStatusAppliedResultSchema,
]);

export type RankedCandidate = z.infer<typeof rankedCandidateSchema>;
export type ShortlistResult = z.infer<typeof shortlistResultSchema>;
export type ConcernsResult = z.infer<typeof concernsResultSchema>;
export type ComparisonResult = z.infer<typeof comparisonResultSchema>;
export type SkillFocusResult = z.infer<typeof skillFocusResultSchema>;
export type RefocusResult = z.infer<typeof refocusResultSchema>;
export type CandidateStatusProposalResult = z.infer<typeof candidateStatusProposalResultSchema>;
export type CandidateStatusAppliedResult = z.infer<typeof candidateStatusAppliedResultSchema>;
export type ExecutionResult = z.infer<typeof executionResultSchema>;
