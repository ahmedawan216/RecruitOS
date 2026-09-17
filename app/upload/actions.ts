"use server";

import { captureOutcome } from "@/lib/analytics/server";

import { requireAuthenticatedUser } from "@/lib/supabase/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { extractCandidateProfile } from "@/lib/recruitos/candidate-extraction";
import { upsertCandidateFromProfile } from "@/lib/recruitos/candidates";
import { extractText, getDocumentProxy } from "unpdf";

export type UploadState = {
  success: boolean;
  error?: string;
  extractionStatus?: "success" | "failed";
  resumeId?: string;
  candidateId?: string;
  candidateWarning?: string;
};

export async function uploadResume(_prevState: UploadState, formData: FormData): Promise<UploadState> {
  try {
    const user = await requireAuthenticatedUser();
    const file = formData.get("resume");
    const jobIdValue = formData.get("jobId");
    const jobId = typeof jobIdValue === "string" && jobIdValue ? jobIdValue : null;

    if (!(file instanceof File)) return { success: false, error: "Please select a PDF file." };
    if (file.type !== "application/pdf") return { success: false, error: "Please upload a PDF file." };
    if (file.size === 0) return { success: false, error: "The uploaded file is empty." };
    if (file.size > 10 * 1024 * 1024) return { success: false, error: "Please upload a PDF file smaller than 10 MB." };

    if (jobId) {
      const { data: job, error: jobError } = await supabaseAdmin
        .from("jobs")
        .select("id")
        .eq("id", jobId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (jobError || !job) return { success: false, error: "The selected job could not be found." };
    }

    const storagePath = `${user.id}/${crypto.randomUUID()}.pdf`;
    const fileBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabaseAdmin.storage
      .from("resumes")
      .upload(storagePath, fileBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase Storage upload error:", uploadError);
      return { success: false, error: "Upload failed. Please try again." };
    }

    const { data: resume, error: createError } = await supabaseAdmin
      .from("resumes")
      .insert({
        user_id: user.id,
        original_filename: file.name,
        storage_path: storagePath,
        extracted_text: null,
        extraction_error: null,
        status: "pending",
        processing_status: "processing",
        processing_error: null,
      })
      .select("id")
      .single();

    if (createError || !resume) {
      console.error("Supabase resume record creation error:", createError);
      await supabaseAdmin.storage.from("resumes").remove([storagePath]);
      return { success: false, error: "Failed to create the resume processing record." };
    }

    let extractedText = "";
    let extractionStatus: "success" | "failed" = "success";
    let extractionError: string | null = null;

    try {
      const pdf = await getDocumentProxy(new Uint8Array(fileBuffer));
      const { text } = await extractText(pdf, { mergePages: true });
      extractedText = text.trim();

      if (!extractedText) {
        extractionStatus = "failed";
        extractionError = "No text could be extracted from this PDF.";
      }
    } catch (error) {
      extractionStatus = "failed";
      extractionError = error instanceof Error ? error.message : "Unknown PDF extraction error.";
      console.error("PDF extraction error:", error);
    }

    if (extractionStatus === "failed") {
      await supabaseAdmin
        .from("resumes")
        .update({
          status: "failed",
          extraction_error: extractionError,
          processing_status: "failed",
          processing_error: extractionError,
        })
        .eq("id", resume.id)
        .eq("user_id", user.id);

      return {
        success: true,
        extractionStatus: "failed",
        resumeId: resume.id,
        error: extractionError ?? "Resume extraction failed.",
      };
    }

    let candidateId: string | undefined;
    let candidateWarning: string | undefined;

    try {
      const profile = await extractCandidateProfile(extractedText);
      candidateId = await upsertCandidateFromProfile(user.id, profile);
    } catch (error) {
      console.error("Candidate extraction error:", error);
      candidateWarning = "The resume was saved, but candidate profile extraction could not be completed yet.";
    }

    const { error: updateError } = await supabaseAdmin
      .from("resumes")
      .update({
        candidate_id: candidateId ?? null,
        extracted_text: extractedText,
        extraction_error: null,
        status: "success",
        processing_status: "completed",
        processing_error: null,
      })
      .eq("id", resume.id)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Supabase resume update error:", updateError);
      await supabaseAdmin
        .from("resumes")
        .update({
          status: "failed",
          processing_status: "failed",
          processing_error: "Failed to save extracted resume data.",
        })
        .eq("id", resume.id)
        .eq("user_id", user.id);
      return { success: false, error: "Failed to save extracted resume data." };
    }

    if (candidateId) {
      const { error: activityError } = await supabaseAdmin.from("candidate_activity").insert({
        user_id: user.id,
        candidate_id: candidateId,
        job_id: jobId,
        type: "resume_uploaded",
        metadata: { resumeId: resume.id, filename: file.name },
      });
      if (activityError) console.error("Candidate activity insert error:", activityError);
    }

    await captureOutcome(user.id, "resume_processed", { resume_count: 1, profile_created: Boolean(candidateId) }, resume.id);
    return {
      success: true,
      extractionStatus: "success",
      resumeId: resume.id,
      candidateId,
      candidateWarning,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return { success: false, error: "Please sign in to upload a resume." };
    }

    console.error("Unexpected resume upload error:", error);
    return { success: false, error: "Something went wrong while uploading the resume." };
  }
}
