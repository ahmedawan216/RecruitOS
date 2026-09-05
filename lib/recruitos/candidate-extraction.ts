import OpenAI from "openai";
import { z } from "zod";

import { normalizeEmail, normalizeSkills } from "@/lib/recruitos/skills";

// Keep V2 candidate extraction on the supported production model rather than
// inheriting a stale GROQ_MODEL deployment variable from V1.
const GROQ_MODEL = "openai/gpt-oss-120b";

let extractorClient: OpenAI | null = null;

const nullableString = z.string().nullish().transform((value) => value ?? null);
const nullableNumber = z.number().min(0).nullish().transform((value) => value ?? null);
const nullableDescription = z
  .union([z.string(), z.array(z.string()).transform((items) => items.join("\n"))])
  .nullish()
  .transform((value) => value ?? null);

function getExtractorClient(): OpenAI {
  if (extractorClient) return extractorClient;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("AI provider is not configured.");

  extractorClient = new OpenAI({
    apiKey,
    baseURL: "https://api.groq.com/openai/v1",
  });

  return extractorClient;
}

const candidateProfileSchema = z.object({
  fullName: nullableString,
  email: nullableString,
  phone: nullableString,
  location: nullableString,
  headline: nullableString,
  skills: z.array(z.string()),
  experience: z.array(
    z.object({
      company: nullableString,
      title: nullableString,
      startDate: nullableString,
      endDate: nullableString,
      description: nullableDescription,
    })
  ),
  education: z.array(
    z.object({
      institution: nullableString,
      degree: nullableString,
      field: nullableString,
      startDate: nullableString,
      endDate: nullableString,
    })
  ),
  yearsExperience: nullableNumber,
});

export type CandidateProfile = z.infer<typeof candidateProfileSchema>;

export async function extractCandidateProfile(resumeText: string): Promise<CandidateProfile> {
  const extractor = getExtractorClient();

  const completion = await extractor.chat.completions.create({
    model: GROQ_MODEL,
    response_format: { type: "json_object" },
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `Extract a candidate profile from the resume. Use only information present in the resume. Never invent missing values. Return JSON only with exactly these fields: fullName, email, phone, location, headline, skills, experience, education, yearsExperience. Use null when unknown. Keep dates as written when possible. yearsExperience must be a conservative numeric estimate or null.`,
      },
      { role: "user", content: resumeText.slice(0, 50000) },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("The AI provider returned an empty response.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("The AI provider returned invalid structured data.");
  }

  const result = candidateProfileSchema.safeParse(parsed);
  if (!result.success) {
    const valueAtPath = (path: PropertyKey[]) => path.reduce<unknown>(
      (value, key) => value && typeof value === "object" ? (value as Record<PropertyKey, unknown>)[key] : undefined,
      parsed
    );
    console.error(
      "Candidate profile validation failed:",
      result.error.issues.map((issue) => {
        const actual = valueAtPath(issue.path);
        return {
          path: issue.path.join("."),
          code: issue.code,
          expected: "expected" in issue ? issue.expected : undefined,
          actual: actual === undefined ? "missing" : actual === null ? "null" : Array.isArray(actual) ? "array" : typeof actual,
        };
      })
    );
    throw new Error("The AI provider returned an unexpected candidate profile.");
  }

  return {
    ...result.data,
    email: normalizeEmail(result.data.email),
    skills: normalizeSkills(result.data.skills),
  };
}
