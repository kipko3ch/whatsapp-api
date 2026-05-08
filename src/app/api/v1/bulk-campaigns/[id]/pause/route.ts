import { CampaignStatus, SendJobStatus } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, requireContext } from "@/lib/api-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireContext(req, ["campaigns:manage"]);
    const campaign = await prisma.bulkCampaign.update({
      where: { id: params.id, workspaceId: ctx.workspaceId },
      data: { status: CampaignStatus.paused, pausedAt: new Date() },
    });
    await prisma.sendJob.updateMany({
      where: { workspaceId: ctx.workspaceId, campaignId: campaign.id, status: { in: [SendJobStatus.queued, SendJobStatus.retrying] } },
      data: { status: SendJobStatus.canceled, errorMessage: "Campaign paused." },
    });
    return NextResponse.json({ data: campaign });
  } catch (error) {
    return apiError(error);
  }
}
