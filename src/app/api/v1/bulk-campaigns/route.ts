import { CampaignStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, requireContext } from "@/lib/api-context";
import { normalizePhone } from "@/lib/phone";
import { enqueueCampaign } from "@/lib/jobs/bulk";
import { createCampaignSchema } from "@/lib/validators/campaigns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireContext(req, ["campaigns:manage"]);
    const campaigns = await prisma.bulkCampaign.findMany({
      where: { workspaceId: ctx.workspaceId },
      include: {
        device: true,
        _count: { select: { recipients: true, sendJobs: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: campaigns });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireContext(req, ["campaigns:manage"]);
    const body = createCampaignSchema.parse(await req.json());

    if (body.device_id) {
      const device = await prisma.whatsappDevice.findFirst({
        where: { id: body.device_id, workspaceId: ctx.workspaceId },
      });
      if (!device) {
        return NextResponse.json({ error: { code: "device_not_found", message: "Device not found." } }, { status: 404 });
      }
    }

    const scheduled = body.scheduled_at && body.scheduled_at > new Date();
    const campaign = await prisma.bulkCampaign.create({
      data: {
        workspaceId: ctx.workspaceId,
        deviceId: body.device_id,
        name: body.name,
        status: scheduled ? CampaignStatus.scheduled : CampaignStatus.draft,
        messageText: body.message_text,
        rateLimitPerMinute: body.rate_limit_per_minute,
        delayMinMs: body.delay_min_ms,
        delayMaxMs: body.delay_max_ms,
        scheduledAt: body.scheduled_at,
        recipients: {
          createMany: {
            data: body.recipients.map((recipient) => ({
              phone: normalizePhone(recipient.phone),
              name: recipient.name,
              variables: recipient.variables ? (JSON.parse(JSON.stringify(recipient.variables)) as Prisma.InputJsonObject) : undefined,
            })),
            skipDuplicates: true,
          },
        },
      },
      include: { recipients: true },
    });

    if (!scheduled && body.device_id) {
      await enqueueCampaign(campaign.id);
    }

    return NextResponse.json({ data: campaign }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
