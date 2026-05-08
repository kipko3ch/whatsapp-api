import { DeliveryStatus } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, requireContext } from "@/lib/api-context";
import { signPayload } from "@/lib/crypto";
import { deliverWebhook } from "@/lib/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireContext(req, ["webhooks:manage"]);
    const webhook = await prisma.webhook.findFirst({
      where: { id: params.id, workspaceId: ctx.workspaceId },
    });

    if (!webhook) {
      return NextResponse.json({ error: { code: "not_found", message: "Webhook not found." } }, { status: 404 });
    }

    const payload = {
      id: crypto.randomUUID(),
      event: "test",
      created_at: new Date().toISOString(),
      data: { ok: true, note: "Test delivery from Baileys-powered WhatsApp API platform." },
    };
    const delivery = await prisma.webhookDelivery.create({
      data: {
        workspaceId: ctx.workspaceId,
        webhookId: webhook.id,
        event: "message_received",
        payload,
        signature: signPayload(payload, webhook.secret),
        status: DeliveryStatus.pending,
      },
    });

    await deliverWebhook(delivery.id);
    const updated = await prisma.webhookDelivery.findUnique({ where: { id: delivery.id } });
    return NextResponse.json({ data: updated });
  } catch (error) {
    return apiError(error);
  }
}
