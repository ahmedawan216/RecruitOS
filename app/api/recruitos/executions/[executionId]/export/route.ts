import { NextResponse } from "next/server";

import { getOwnedAnalysisExport } from "@/lib/recruitos/analysis-export-server";

type Context = { params: Promise<{ executionId: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const { executionId } = await params;
    const result = await getOwnedAnalysisExport(executionId);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

    return new Response(result.html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Please sign in to download this RecruitOS analysis." }, { status: 401 });
    }
    console.error("RecruitOS analysis export failed:", error);
    return NextResponse.json({ error: "RecruitOS could not prepare this analysis download." }, { status: 500 });
  }
}
