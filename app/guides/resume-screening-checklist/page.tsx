import Link from "next/link";

import { JsonLd } from "@/components/seo/json-ld";
import { PublicPage } from "@/components/seo/public-page";
import { publicMetadata, publicOrigin } from "@/lib/seo";

const path = "/guides/resume-screening-checklist";

export const metadata = publicMetadata(
  "Resume screening checklist for recruiters",
  "Use a practical resume screening checklist to define role criteria, review evidence consistently, record questions, and keep hiring decisions with people.",
  path,
);

const checklistSteps = [
  {
    name: "Define the role criteria",
    text: "Separate essential requirements from preferences and describe the evidence that could support each requirement.",
  },
  {
    name: "Review the resume against the same criteria",
    text: "Record what is supported, partly supported, not established, or needs clarification without turning missing information into an automatic rejection.",
  },
  {
    name: "Check the source and capture questions",
    text: "Return to the original resume for material claims and write neutral follow-up questions for unclear evidence.",
  },
  {
    name: "Calibrate before comparing candidates",
    text: "Apply the same role requirements across the candidate group and revisit earlier reviews if the requirements change.",
  },
  {
    name: "Keep the decision with the hiring team",
    text: "Use software output as review support, not as a hiring probability or an autonomous decision.",
  },
] as const;

export default function ResumeScreeningChecklistPage() {
  return (
    <>
      <PublicPage
        title="A practical resume screening checklist for recruiters"
        intro="Use this checklist before and during resume review to keep the job requirements, source evidence, open questions, and human decision in view. You can use it without creating an account."
        path={path}
      >
        <section>
          <h2>Before opening the first resume</h2>
          <ul>
            <li><strong>Confirm the role:</strong> write down the responsibilities and outcomes the person will own.</li>
            <li><strong>Separate essentials from preferences:</strong> do not let a long wish list silently become the screening threshold.</li>
            <li><strong>Define acceptable evidence:</strong> note the experience, work examples, qualifications, or transferable skills that could support each requirement.</li>
            <li><strong>Agree on the reviewer:</strong> decide who will check the source and who is responsible for the next recruiting action.</li>
          </ul>
          <p>If the role criteria are still changing, resolve that first. A consistent review is not possible when every resume is judged against a different version of the job.</p>
        </section>

        <section>
          <h2>Use the checklist for each resume</h2>
          <p><a href="/templates/resume-screening-checklist.csv" download>Download the blank resume screening checklist (CSV)</a>, or copy the checks below into your existing hiring document.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <caption className="mb-3 text-left">Blank resume screening checklist</caption>
              <thead>
                <tr>
                  <th className="border p-3" scope="col">Check</th>
                  <th className="border p-3" scope="col">What to record</th>
                  <th className="border p-3" scope="col">Complete</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Role context", "Correct job and current requirements", "Yes / No"],
                  ["Essential criteria", "Supporting resume evidence and source section", "Yes / No"],
                  ["Preferred criteria", "Relevant evidence without treating it as essential", "Yes / No"],
                  ["Evidence gaps", "What the resume does not establish", "Yes / No"],
                  ["Questions", "Neutral follow-up for unclear or incomplete evidence", "Yes / No"],
                  ["Source check", "Material claims checked against the original resume", "Yes / No"],
                  ["Next review", "Reviewer and next action; no automatic decision", "Yes / No"],
                ].map(([check, record, complete]) => (
                  <tr key={check}>
                    <th className="border p-3" scope="row">{check}</th>
                    <td className="border p-3">{record}</td>
                    <td className="border p-3">{complete}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2>Label evidence without inventing certainty</h2>
          <p>For each important requirement, distinguish between <strong>supported</strong>, <strong>partly supported</strong>, <strong>not established</strong>, and <strong>needs clarification</strong>. “Not established” means the resume does not provide enough information; it does not prove the candidate lacks the ability.</p>
          <p>For a reusable place to record those labels, use the <Link href="/guides/candidate-evaluation-template">candidate evaluation worksheet</Link>.</p>
        </section>

        <section>
          <h2>Screen resumes against the job description</h2>
          <ol>
            <li>Confirm that the job description reflects the role actually being filled.</li>
            <li>Review one requirement at a time instead of relying on an overall impression.</li>
            <li>Record the resume section or example that supports each material conclusion.</li>
            <li>Write a follow-up question where scope, depth, dates, or responsibility remain unclear.</li>
            <li>Check the original resume before moving to comparison or another recruiting action.</li>
          </ol>
          <p>RecruitOS can organize this review inside the active job context. See how <Link href="/resume-analysis">resume screening and analysis works in RecruitOS</Link>.</p>
        </section>

        <section>
          <h2>Calibrate before comparing candidates</h2>
          <p>Have reviewers apply the checklist to the same fictional or non-sensitive sample and discuss disagreements before reviewing the full candidate group. If the requirements change, revisit earlier evaluations rather than comparing reviews made against different standards.</p>
          <p>When each candidate has been reviewed against the same role, continue to the <Link href="/compare-candidates">candidate comparison workflow</Link>.</p>
        </section>

        <section>
          <h2>What software can support—and what people still decide</h2>
          <p>Software can help organize role criteria, surface relevant resume evidence, and keep strengths, gaps, and questions visible. It can also make mistakes or miss context. A match score is not a hiring probability, and no score should automatically decide who advances.</p>
          <p>Recruiters and hiring teams remain responsible for checking the source, considering wider context, speaking with candidates, and deciding what happens next.</p>
        </section>
      </PublicPage>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "Resume screening checklist for recruiters",
          description: "A practical process for reviewing resumes against role requirements while keeping hiring decisions under human control.",
          url: `${publicOrigin}${path}`,
          step: checklistSteps.map((step, index) => ({
            "@type": "HowToStep",
            position: index + 1,
            name: step.name,
            text: step.text,
          })),
        }}
      />
    </>
  );
}
