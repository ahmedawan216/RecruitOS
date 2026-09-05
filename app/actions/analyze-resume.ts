"use server";

import { requireAuthenticatedUser } from "@/lib/supabase/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { extractCandidateProfile } from "@/lib/recruitos/candidate-extraction";
import { upsertCandidateFromProfile } from "@/lib/recruitos/candidates";
import OpenAI from "openai";
import { z } from "zod";

// Keep the production RecruitOS model explicit. Vercel environments can retain
// stale GROQ_MODEL values from V1; allowing that value to override this would
// reintroduce model-not-found failures at runtime.
const GROQ_MODEL = "openai/gpt-oss-120b";

let groqClient: OpenAI | null = null;

function getGroqClient(): OpenAI {
  if (groqClient) return groqClient;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("RecruitOS is not configured correctly.");

  groqClient = new OpenAI({
    apiKey,
    baseURL: "https://api.groq.com/openai/v1",
  });

  return groqClient;
}

const analysisSchema = z.object({
  recommendation: z.enum(["interview", "maybe", "reject"]),
  matchScore: z.number().min(0).max(100),
  summary: z.string(),
  whyStrongMatch: z.string(),
  matchingSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  yearsRelevantExperience: z.number().min(0),
  potentialConcerns: z.array(z.string()),
  confidence: z.enum(["low", "medium", "high"]),
  reasoning: z.string(),
});

export async function analyzeResume(resumeId: string, jobId: string) {
  try {
    const user = await requireAuthenticatedUser();
    if (!resumeId) return { success: false, error: "No resume ID was provided." };
    if (!jobId) return { success: false, error: "No job ID was provided." };

    const { data: resume, error: resumeError } = await supabaseAdmin
      .from("resumes")
      .select("id, candidate_id, extracted_text, extraction_error, status")
      .eq("id", resumeId)
      .eq("user_id", user.id)
      .single();
    if (resumeError || !resume) {
      console.error("Resume fetch error:", resumeError);
      return { success: false, error: "Resume not found." };
    }
    if (resume.status !== "success" || !resume.extracted_text?.trim()) {
      return { success: false, error: resume.extraction_error || "This resume has no extracted text to analyze." };
    }

    const { data: job, error: jobError } = await supabaseAdmin
      .from("jobs")
      .select("id, title, description, status, lifecycle_status")
      .eq("id", jobId)
      .eq("user_id", user.id)
      .single();
    if (jobError || !job) {
      console.error("Job fetch error:", jobError);
      return { success: false, error: "Job not found." };
    }

    let candidateId = resume.candidate_id;
    if (!candidateId) {
      try {
        const profile = await extractCandidateProfile(resume.extracted_text);
        candidateId = await upsertCandidateFromProfile(user.id, profile);

        const { data: linkedResume, error: linkError } = await supabaseAdmin
          .from("resumes")
          .update({ candidate_id: candidateId })
          .eq("id", resumeId)
          .eq("user_id", user.id)
          .select("candidate_id")
          .single();

        if (linkError || linkedResume?.candidate_id !== candidateId) {
          throw linkError ?? new Error("Candidate association failed.");
        }
      } catch (error) {
        const diagnostic = error instanceof Error
          ? { name: error.name, message: error.message }
          : { code: typeof error === "object" && error && "code" in error ? String(error.code) : "unknown" };
        console.error("Candidate recovery failed during analysis:", diagnostic);
        return {
          success: false,
          error: "RecruitOS could not create or update the candidate profile. Please retry the analysis.",
        };
      }
    }

    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      response_format: { type: "json_object" },
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `You are RecruitOS, an experienced technical recruiting and hiring assistant. Evaluate a candidate resume against the provided job description. Use ONLY information actually present in the resume. Do not invent experience, skills, education, certifications, or achievements. Return ONLY valid JSON with exactly these fields: {"recommendation":"interview"|"maybe"|"reject","matchScore":number,"summary":string,"whyStrongMatch":string,"matchingSkills":string[],"missingSkills":string[],"yearsRelevantExperience":number,"potentialConcerns":string[],"confidence":"low"|"medium"|"high","reasoning":string}. The recruiter remains the decision maker; do not claim the AI makes a hiring decision.`,
        },
        {
          role: "user",
          content: `JOB TITLE:\n${job.title}\n\nJOB DESCRIPTION:\n${job.description}\n\nCANDIDATE RESUME:\n${resume.extracted_text}\n\nAnalyze the candidate against THIS job.`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return { success: false, error: "RecruitOS returned an empty response." };

    let parsedResponse: unknown;
    try {
      parsedResponse = JSON.parse(content);
    } catch (error) {
      console.error("Groq JSON parse error:", error);
      return { success: false, error: "RecruitOS returned an invalid analysis response." };
    }

    const validation = analysisSchema.safeParse(parsedResponse);
    if (!validation.success) {
      console.error("Groq response validation error:", validation.error.flatten());
      return { success: false, error: "RecruitOS returned an unexpected analysis format." };
    }

    const analysis = validation.data;
    const analysisData = {
      user_id: user.id,
      candidate_id: candidateId,
      resume_id: resumeId,
      job_id: jobId,
      job_description_text: job.description,
      status: "success",
      error_message: null,
      recommendation: analysis.recommendation,
      match_score: Math.round(analysis.matchScore),
      confidence_level: analysis.confidence,
      summary: analysis.summary,
      why_strong_match: analysis.whyStrongMatch,
      matching_skills: analysis.matchingSkills,
      missing_skills: analysis.missingSkills,
      potential_concerns: analysis.potentialConcerns,
      years_relevant_experience: analysis.yearsRelevantExperience,
      reasoning: analysis.reasoning,
      model: GROQ_MODEL,
      raw_response: analysis,
    };

    const { data: existingAnalysis, error: existingAnalysisError } = await supabaseAdmin
      .from("resume_analyses")
      .select("id")
      .eq("resume_id", resumeId)
      .eq("job_id", jobId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingAnalysisError) {
      console.error("Existing analysis lookup error:", existingAnalysisError);
      return { success: false, error: "Failed to check for an existing analysis." };
    }

    let analysisId: string;
    if (existingAnalysis) {
      const { data, error } = await supabaseAdmin
        .from("resume_analyses")
        .update(analysisData)
        .eq("id", existingAnalysis.id)
        .eq("user_id", user.id)
        .select("id")
        .single();
      if (error || !data) {
        console.error("Resume analysis update error:", error);
        return { success: false, error: "Failed to update AI analysis." };
      }
      analysisId = data.id;
    } else {
      const { data, error } = await supabaseAdmin
        .from("resume_analyses")
        .insert(analysisData)
        .select("id")
        .single();
      if (error || !data) {
        console.error("Resume analysis insert error:", error);
        return { success: false, error: "Failed to save AI analysis." };
      }
      analysisId = data.id;
    }

    const { data: existingMatch, error: existingMatchError } = await supabaseAdmin
      .from("candidate_job_matches")
      .select("id, recruiter_status")
      .eq("candidate_id", candidateId)
      .eq("job_id", jobId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingMatchError) {
      console.error("Candidate match lookup failed after analysis:", { code: existingMatchError.code });
      return { success: false, error: "RecruitOS could not update the candidate workflow. Please retry the analysis." };
    }

    const matchData = {
      user_id: user.id,
      candidate_id: candidateId,
      job_id: jobId,
      resume_id: resumeId,
      latest_analysis_id: analysisId,
      match_score: Math.round(analysis.matchScore),
      recommendation: analysis.recommendation,
      recruiter_status: existingMatch?.recruiter_status ?? "new",
      updated_at: new Date().toISOString(),
    };

    const { error: matchError } = existingMatch
      ? await supabaseAdmin.from("candidate_job_matches").update(matchData).eq("id", existingMatch.id).eq("user_id", user.id)
      : await supabaseAdmin.from("candidate_job_matches").insert(matchData);

    if (matchError) {
      console.error("Candidate match persistence failed after analysis:", { code: matchError.code });
      return { success: false, error: "RecruitOS could not update the candidate workflow. Please retry the analysis." };
    }

    const { error: activityError } = await supabaseAdmin.from("candidate_activity").insert({
      user_id: user.id,
      candidate_id: candidateId,
      job_id: jobId,
      type: "analysis_completed",
      metadata: { analysisId, matchScore: Math.round(analysis.matchScore), recommendation: analysis.recommendation },
    });

    if (activityError) {
      console.error("Candidate activity persistence failed after analysis:", { code: activityError.code });
      return { success: false, error: "RecruitOS could not update the candidate workflow. Please retry the analysis." };
    }

    return { success: true, resumeId, jobId, analysisId, candidateId };
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return { success: false, error: "Please sign in to analyze a resume." };
    }
    console.error("Unexpected RecruitOS analysis error:", error);
    return { success: false, error: "Something went wrong while analyzing the resume." };
  }
}
