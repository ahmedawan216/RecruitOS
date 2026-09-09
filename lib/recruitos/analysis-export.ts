import type { ExecutionResult } from "@/lib/recruitos/result";

export const ANALYSIS_DISCLAIMER = "Decision support only. RecruitOS has not rejected, advanced, contacted, scheduled, or otherwise changed any candidate. Stored match scores and analytical relevance scores are not hiring probabilities; the recruiter remains responsible for hiring decisions.";

export type AnalysisExportData = {
  commandText: string;
  completedAt: string;
  result: ExecutionResult;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]!);
}

function list(items: string[], empty: string) {
  if (!items.length) return `<p>${escapeHtml(empty)}</p>`;
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function identity(candidate: { name: string | null; email: string | null }) {
  return escapeHtml(candidate.name || candidate.email || "Unnamed candidate");
}

function score(value: number) {
  return `<div class="score"><strong>${value}/100</strong><span>Stored match score · not a hiring probability</span></div>`;
}

function shortlistBody(result: Extract<ExecutionResult, { kind: "candidate_shortlist" }>) {
  return `<div class="meta"><div class="metric"><span>Applicants considered</span><strong>${result.consideredCount}</strong></div><div class="metric"><span>Existing assessments</span><strong>${result.reusedAnalysisCount}</strong></div><div class="metric"><span>New assessments</span><strong>${result.generatedAnalysisCount}</strong></div><div class="metric"><span>Prepared candidates</span><strong>${result.rankedCount}</strong></div></div>
  ${result.partial ? `<p class="muted">Partial result: ${result.analysisFailureCount} applicant assessment${result.analysisFailureCount === 1 ? "" : "s"} could not be completed. The ranking uses only available validated evidence.</p>` : ""}
  ${result.candidates.map((candidate) => `<section class="candidate"><div class="candidate-head"><div><span class="rank">#${candidate.rank}</span><h2>${identity(candidate)}</h2>${candidate.email && candidate.name ? `<p>${escapeHtml(candidate.email)}</p>` : ""}</div>${score(candidate.matchScore)}</div>${candidate.summary ? `<p class="summary">${escapeHtml(candidate.summary)}</p>` : ""}<div class="columns"><div><h3>Evidence</h3>${list(candidate.evidence, "No additional evidence summary stored.")}</div><div><h3>Strengths</h3>${list(candidate.strengths, "No structured strengths stored.")}</div><div><h3>Concerns / gaps</h3>${list([...candidate.concerns, ...candidate.missingSkills], "No structured concerns stored.")}</div></div><p class="status">Recruiter status: ${escapeHtml(candidate.recruiterStatus ?? "not set")}</p></section>`).join("")}`;
}

function concernsBody(result: Extract<ExecutionResult, { kind: "candidate_concerns" }>) {
  return `<p class="view-note">Current analytical view: concerns and gaps across the bounded ${result.candidateSetCount}-candidate task result.</p>${result.candidates.map((candidate) => `<section class="candidate"><div class="candidate-head"><div><span class="rank">#${candidate.rank}</span><h2>${identity(candidate)}</h2></div>${score(candidate.matchScore)}</div><div class="columns two"><div><h3>Primary concerns</h3>${list(candidate.concerns, "No structured concerns are present in the stored analysis.")}</div><div><h3>Gaps / missing evidence</h3>${list(candidate.missingSkills, "No structured skill gaps are present in the stored analysis.")}</div></div></section>`).join("")}`;
}

function comparisonBody(result: Extract<ExecutionResult, { kind: "candidate_comparison" }>) {
  return `<p class="view-note">Current analytical view: comparison of ${result.comparedCount} candidates from the bounded ${result.sourceCandidateCount}-candidate task result.</p>${result.candidates.map((candidate) => `<section class="candidate"><div class="candidate-head"><div><span class="rank">Original shortlist #${candidate.originalRank}</span><h2>${identity(candidate)}</h2></div>${score(candidate.matchScore)}</div>${candidate.summary ? `<p class="summary">${escapeHtml(candidate.summary)}</p>` : ""}<div class="columns"><div><h3>Evidence</h3>${list(candidate.evidence, "No additional evidence summary stored.")}</div><div><h3>Strengths</h3>${list(candidate.strengths, "No structured strengths stored.")}</div><div><h3>Concerns / gaps</h3>${list([...candidate.concerns, ...candidate.missingSkills], "No structured concerns stored.")}</div></div><p class="status">Relevant experience: ${candidate.yearsRelevantExperience === null ? "not established" : `${candidate.yearsRelevantExperience} years`} · Recruiter status: ${escapeHtml(candidate.recruiterStatus ?? "not set")}</p></section>`).join("")}`;
}

function skillFocusBody(result: Extract<ExecutionResult, { kind: "candidate_skill_focus" }>) {
  return `<p class="view-note">Current analytical view: evidence focus on <strong>${escapeHtml(result.focus)}</strong> across the same bounded ${result.candidateSetCount}-candidate task result.</p>${result.insufficientEvidence ? `<p class="warning">The stored candidate evidence does not reliably establish ${escapeHtml(result.focus)}. Missing evidence is treated as uncertainty, not negative evidence.</p>` : ""}${result.candidates.map((candidate) => `<section class="candidate"><div class="candidate-head"><div><span class="rank">#${candidate.rank} · Original shortlist #${candidate.originalRank}</span><h2>${identity(candidate)}</h2><p>Evidence strength: ${escapeHtml(candidate.evidenceStrength)} · Focus relevance: ${candidate.relevanceScore}/100</p></div>${score(candidate.matchScore)}</div><div><h3>Relevant stored evidence</h3>${list(candidate.relevantEvidence, "No reliable stored evidence was identified for this focus.")}</div>${candidate.uncertainty ? `<p class="muted">Uncertainty: ${escapeHtml(candidate.uncertainty)}</p>` : ""}</section>`).join("")}`;
}

function refocusBody(result: Extract<ExecutionResult, { kind: "candidate_refocus" }>) {
  return `<p class="view-note">Current analytical view: analytical refocus on <strong>${escapeHtml(result.focus)}</strong> across the same bounded ${result.candidateSetCount}-candidate task result. This does not modify the job requirements.</p>${result.insufficientEvidence ? `<p class="warning">The stored candidate evidence does not reliably establish ${escapeHtml(result.focus)}. Missing evidence is treated as uncertainty, not negative evidence.</p>` : ""}${result.candidates.map((candidate) => `<section class="candidate"><div class="candidate-head"><div><span class="rank">Focus #${candidate.focusRank} · Original shortlist #${candidate.originalRank}</span><h2>${identity(candidate)}</h2><p>Evidence strength: ${escapeHtml(candidate.evidenceStrength)} · Focus relevance: ${candidate.relevanceScore}/100${candidate.movement ? ` · ${candidate.movement > 0 ? "Up" : "Down"} ${Math.abs(candidate.movement)}` : " · Unchanged"}</p></div>${score(candidate.matchScore)}</div><div><h3>Relevant stored evidence</h3>${list(candidate.relevantEvidence, "No reliable stored evidence was identified for this focus.")}</div>${candidate.uncertainty ? `<p class="muted">Uncertainty: ${escapeHtml(candidate.uncertainty)}</p>` : ""}</section>`).join("")}`;
}

function viewLabel(result: ExecutionResult) {
  switch (result.kind) {
    case "candidate_shortlist": return "Full shortlist";
    case "candidate_concerns": return "Concerns / gaps";
    case "candidate_comparison": return "Candidate comparison";
    case "candidate_skill_focus": return `Evidence focus · ${result.focus}`;
    case "candidate_refocus": return `Analytical refocus · ${result.focus}`;
  }
}

function resultBody(result: ExecutionResult) {
  switch (result.kind) {
    case "candidate_shortlist": return shortlistBody(result);
    case "candidate_concerns": return concernsBody(result);
    case "candidate_comparison": return comparisonBody(result);
    case "candidate_skill_focus": return skillFocusBody(result);
    case "candidate_refocus": return refocusBody(result);
  }
}

export function renderAnalysisHtml(data: AnalysisExportData) {
  const { result } = data;
  const prepared = new Date(data.completedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RecruitOS analysis · ${escapeHtml(result.job.title)}</title><style>
  :root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#171717;background:#fff}*{box-sizing:border-box}body{margin:0;padding:40px}main{max-width:960px;margin:0 auto}header{border-bottom:1px solid #ddd;padding-bottom:24px;margin-bottom:24px}.brand{font-size:14px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.muted,p,li{color:#555;line-height:1.55}h1{font-size:30px;margin:8px 0}h2{font-size:20px;margin:0}.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:24px 0}.metric{border:1px solid #ddd;border-radius:10px;padding:14px}.metric span{display:block;font-size:12px;color:#666}.metric strong{font-size:24px}.command,.view-note,.warning{border-radius:10px;padding:16px}.command,.view-note{background:#f6f6f6}.warning{border:1px solid #ddd}.candidate{page-break-inside:avoid;border-top:1px solid #ddd;padding:24px 0}.candidate-head{display:flex;justify-content:space-between;gap:24px}.rank{font-size:13px;font-weight:700}.score{text-align:right}.score strong,.score span{display:block}.score strong{font-size:24px}.score span{font-size:11px;color:#666}.summary{max-width:760px}.columns{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.columns.two{grid-template-columns:repeat(2,1fr)}.columns h3,.candidate h3{font-size:13px}.columns ul,.candidate ul{padding-left:18px}.status{font-size:12px;text-transform:none}.disclaimer{margin-top:24px;padding:16px;border:1px solid #ddd;border-radius:10px;font-size:12px}@media(max-width:720px){body{padding:20px}.meta,.columns,.columns.two{grid-template-columns:1fr}.candidate-head{display:block}.score{text-align:left;margin-top:12px}}@media print{body{padding:0}.candidate{break-inside:avoid}}
  </style></head><body><main><header><div class="brand">RecruitOS</div><h1>${escapeHtml(result.job.title)} analysis</h1><p class="muted">Prepared ${escapeHtml(prepared)} UTC · ${escapeHtml(viewLabel(result))}</p></header><div class="command"><strong>Original recruiting task</strong><p>${escapeHtml(data.commandText)}</p></div>${resultBody(result)}<div class="disclaimer">${escapeHtml(ANALYSIS_DISCLAIMER)}</div></main></body></html>`;
}

export function safeAnalysisFilename(jobTitle: string) {
  const slug = jobTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "analysis";
  return `recruitos-${slug}-analysis.html`;
}
