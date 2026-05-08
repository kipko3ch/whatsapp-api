import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, apiError, requireContext } from "@/lib/api-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireContext(req, []);
    if (ctx.actorType === "api_key") throw new ApiError(403, "dashboard_only", "API keys can only be managed from the dashboard.");
    const key = await prisma.apiKey.update({
      where: { id: params.id, workspaceId: ctx.workspaceId },
      data: { revokedAt: new Date() },
    });

    return NextResponse.json({ data: key });
  } catch (error) {
    return apiError(error);
  }
}
