import { MessageDirection, MessageStatus, MessageType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { jidToPhone, normalizePhone } from "@/lib/phone";
import { emitWebhookEvent } from "@/lib/webhooks";

export async function upsertContactAndConversation(input: {
  workspaceId: string;
  deviceId: string;
  jid?: string | null;
  phone: string;
  name?: string | null;
  pushName?: string | null;
}) {
  const phone = normalizePhone(input.phone || jidToPhone(input.jid));

  const contact = await prisma.contact.upsert({
    where: {
      workspaceId_phone: {
        workspaceId: input.workspaceId,
        phone,
      },
    },
    create: {
      workspaceId: input.workspaceId,
      deviceId: input.deviceId,
      phone,
      jid: input.jid,
      name: input.name,
      pushName: input.pushName,
      lastMessageAt: new Date(),
    },
    update: {
      jid: input.jid ?? undefined,
      pushName: input.pushName ?? undefined,
      lastMessageAt: new Date(),
    },
  });

  const conversation = await prisma.conversation.upsert({
    where: {
      deviceId_contactPhone: {
        deviceId: input.deviceId,
        contactPhone: phone,
      },
    },
    create: {
      workspaceId: input.workspaceId,
      deviceId: input.deviceId,
      contactId: contact.id,
      contactPhone: phone,
      title: input.name ?? input.pushName ?? phone,
      lastMessageAt: new Date(),
    },
    update: {
      contactId: contact.id,
      title: input.name ?? input.pushName ?? undefined,
      lastMessageAt: new Date(),
    },
  });

  return { contact, conversation };
}

export async function saveInboundMessage(input: {
  workspaceId: string;
  deviceId: string;
  externalId?: string;
  fromJid: string;
  pushName?: string | null;
  text?: string | null;
  payload?: unknown;
}) {
  const phone = jidToPhone(input.fromJid);
  const { contact, conversation } = await upsertContactAndConversation({
    workspaceId: input.workspaceId,
    deviceId: input.deviceId,
    jid: input.fromJid,
    phone,
    pushName: input.pushName,
  });

  const message = await prisma.message.upsert({
    where: {
      deviceId_externalId: {
        deviceId: input.deviceId,
        externalId: input.externalId ?? `in_${Date.now()}_${phone}`,
      },
    },
    create: {
      workspaceId: input.workspaceId,
      deviceId: input.deviceId,
      conversationId: conversation.id,
      contactId: contact.id,
      contactPhone: phone,
      externalId: input.externalId,
      direction: MessageDirection.inbound,
      type: MessageType.text,
      status: MessageStatus.received,
      text: input.text,
      payload: input.payload as object,
      receivedAt: new Date(),
    },
    update: {
      status: MessageStatus.received,
      text: input.text,
      payload: input.payload as object,
      receivedAt: new Date(),
    },
  });

  await emitWebhookEvent(input.workspaceId, "message_received", {
    event: "message.received",
    message,
    contact,
    conversation,
  });

  return message;
}

export function extractTextFromBaileysMessage(message: Record<string, unknown> | undefined) {
  if (!message) return null;

  const conversation = message.conversation;
  if (typeof conversation === "string") return conversation;

  const extended = message.extendedTextMessage as { text?: string } | undefined;
  if (extended?.text) return extended.text;

  const image = message.imageMessage as { caption?: string } | undefined;
  if (image?.caption) return image.caption;

  const video = message.videoMessage as { caption?: string } | undefined;
  if (video?.caption) return video.caption;

  return null;
}
