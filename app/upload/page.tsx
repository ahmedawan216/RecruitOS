import { redirect } from "next/navigation";

type Props = { searchParams: Promise<{ jobId?: string | string[] }> };

export default async function UploadPage({ searchParams }: Props) {
  const params = await searchParams;
  const jobId = Array.isArray(params.jobId) ? params.jobId[0] : params.jobId;
  redirect(jobId ? `/dashboard/agents/recruitos/analyze?jobId=${encodeURIComponent(jobId)}` : "/dashboard/agents/recruitos/analyze");
}
