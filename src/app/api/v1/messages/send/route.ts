import { MessageDirection, MessageStatus, MessageType } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, apiError, requireContext } from "@/lib/api-context";
import { normalizePhone } from "@/lib/phone";
import { sendMessageSchema } from "@/lib/validators/messages";
import { resolveWhatsappDevice } from "@/lib/whatsapp/devices";
import { whatsappProvider } from "@/lib/whatsapp/manager";
import { upsertContactAndConversation } from "@/lib/whatsapp/store";
import { emitWebhookEvent } from "@/lib/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireContext(req, ["messages:send"]);
    const body = sendMessageSchema.parse(await req.json());
    const phone = normalizePhone(body.to);
    const deviceResolution = await resolveWhatsappDevice(ctx.workspaceId, body.device_id);

    console.info("[messages.send] incoming device_id", {
      workspaceId: ctx.workspaceId,
      inputDeviceId: body.device_id,
      to: phone,
      resolved: deviceResolution.ok,
      matchedBy: deviceResolution.ok ? deviceResolution.matchedBy : deviceResolution.reason,
      resolvedDeviceId: deviceResolution.ok ? deviceResolution.device.id : null,
      resolvedDeviceName: deviceResolution.ok ? deviceResolution.device.name : null,
      resolvedDeviceStatus: deviceResolution.ok ? deviceResolution.device.status : null,
    });

    const [optOut, blacklisted] = await Promise.all([
      prisma.optOut.findUnique({ where: { workspaceId_phone: { workspaceId: ctx.workspaceId, phone } } }),
      prisma.blacklistedNumber.findUnique({ where: { workspaceId_phone: { workspaceId: ctx.workspaceId, phone } } }),
    ]);

    if (!deviceResolution.ok) {
      if (deviceResolution.reason === "ambiguous") {
        return NextResponse.json(
          {
            error: {
              code: "ambiguous_device_id",
              message: "Multiple devices match the provided device_id. Use the internal device_id from /api/v1/devices.",
              matches: deviceResolution.matches,
            },
          },
          { status: 409 },
        );
      }

      return NextResponse.json({ error: { code: "device_not_found", message: "Device not found." } }, { status: 404 });
    }

    const device = deviceResolution.device;

    if (optOut || blacklisted) {
      return NextResponse.json(
        { error: { code: optOut ? "recipient_opted_out" : "recipient_blacklisted", message: "Recipient cannot be messaged." } },
        { status: 409 },
      );
    }

    const { contact, conversation } = await upsertContactAndConversation({
      workspaceId: ctx.workspaceId,
      deviceId: device.id,
      phone,
    });

    const message = await prisma.message.create({
      data: {
        workspaceId: ctx.workspaceId,
        deviceId: device.id,
        conversationId: conversation.id,
        contactId: contact.id,
        contactPhone: phone,
        direction: MessageDirection.outbound,
        type: body.type as MessageType,
        status: MessageStatus.sending,
        text: "text" in body ? body.text : "media" in body ? body.media.caption : null,
        payload: body,
      },
    });

    try {
      const result = await whatsappProvider().sendMessage({
        deviceId: device.id,
        to: phone,
        type: body.type,
        text: "text" in body ? body.text : undefined,
        media: "media" in body ? body.media : undefined,
        location: "location" in body ? body.location : undefined,
        contact: "contact" in body ? body.contact : undefined,
      });

      const updated = await prisma.message.update({
        where: { id: message.id },
        data: {
          status: MessageStatus.sent,
          externalId: result.externalId,
          sentAt: new Date(),
        },
      });

      await emitWebhookEvent(ctx.workspaceId, "message_sent", {
        event: "message.sent",
        message: updated,
      });

      return NextResponse.json({ data: updated });
    } catch (error) {
      const failed = await prisma.message.update({
        where: { id: message.id },
        data: {
          status: MessageStatus.failed,
          errorMessage: error instanceof Error ? error.message : "Message failed.",
        },
      });

      await emitWebhookEvent(ctx.workspaceId, "message_failed", {
        event: "message.failed",
        message: failed,
      });

      throw new ApiError(409, "send_failed", error instanceof Error ? error.message : "Message failed.");
    }
  } catch (error) {
    return apiError(error);
  }
}
