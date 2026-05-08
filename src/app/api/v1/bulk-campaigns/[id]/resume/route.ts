import { CampaignStatus } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, requireContext } from "@/lib/api-context";
import { enqueueCampaign } from "@/lib/jobs/bulk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireContext(req, ["campaigns:manage"]);
    const campaign = await prisma.bulkCampaign.findFirst({
      where: { id: params.id, workspaceId: ctx.workspaceId },
    });
    if (!campaign) {
      return NextResponse.json({ error: { code: "not_found", message: "Campaign not found." } }, { status: 404 });
    }

    await prisma.bulkCampaign.update({
      where: { id: campaign.id },
      data: { status: CampaignStatus.running, pausedAt: null },
    });
    await enqueueCampaign(campaign.id);
    const updated = await prisma.bulkCampaign.findUnique({ where: { id: campaign.id } });
    return NextResponse.json({ data: updated });
  } catch (error) {
    return apiError(error);
  }
}
