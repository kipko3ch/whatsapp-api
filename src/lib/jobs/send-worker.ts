import { MessageDirection, MessageStatus, SendJobStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { whatsappProvider } from "@/lib/whatsapp/manager";
import { emitWebhookEvent } from "@/lib/webhooks";

export async function processSendJob(sendJobId: string) {
  const job = await prisma.sendJob.findUnique({
    where: { id: sendJobId },
    include: { campaign: true },
  });

  if (!job || job.status === SendJobStatus.canceled) return;
  if (job.campaign?.status === "paused" || job.campaign?.status === "canceled") return;

  const blacklisted = await prisma.blacklistedNumber.findUnique({
    where: {
      workspaceId_phone: {
        workspaceId: job.workspaceId,
        phone: normalizePhone(job.recipientPhone),
      },
    },
  });

  const optedOut = await prisma.optOut.findUnique({
    where: {
      workspaceId_phone: {
        workspaceId: job.workspaceId,
        phone: normalizePhone(job.recipientPhone),
      },
    },
  });

  if (blacklisted || optedOut) {
    await prisma.sendJob.update({
      where: { id: job.id },
      data: { status: SendJobStatus.canceled, errorMessage: blacklisted ? "Blacklisted number." : "Opted out." },
    });
    return;
  }

  await prisma.sendJob.update({
    where: { id: job.id },
    data: { status: SendJobStatus.running, lockedAt: new Date(), attempts: { increment: 1 } },
  });

  let messageId = job.messageId;

  if (!messageId) {
    const message = await prisma.message.create({
      data: {
        workspaceId: job.workspaceId,
        deviceId: job.deviceId,
        contactPhone: normalizePhone(job.recipientPhone),
        direction: MessageDirection.outbound,
        type: "text",
        status: MessageStatus.sending,
        text: (job.payload as { text?: string }).text,
        payload: job.payload as object,
      },
    });
    messageId = message.id;
  }

  try {
    const payload = job.payload as { text?: string; type?: "text" };
    const result = await whatsappProvider().sendMessage({
      deviceId: job.deviceId,
      to: job.recipientPhone,
      type: payload.type ?? "text",
      text: payload.text,
    });

    const message = await prisma.message.update({
      where: { id: messageId },
      data: {
        status: MessageStatus.sent,
        externalId: result.externalId,
        sentAt: new Date(),
      },
    });

    await prisma.sendJob.update({
      where: { id: job.id },
      data: { status: SendJobStatus.completed, messageId, completedAt: new Date() },
    });

    if (job.campaignId) {
      await prisma.bulkCampaignRecipient.updateMany({
        where: { campaignId: job.campaignId, phone: normalizePhone(job.recipientPhone) },
        data: { status: "sent", messageId, sentAt: new Date() },
      });
    }

    await emitWebhookEvent(job.workspaceId, "message_sent", {
      event: "message.sent",
      message,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Send failed.";
    await prisma.message.updateMany({
      where: { id: messageId },
      data: { status: MessageStatus.failed, errorMessage: message },
    });
    await prisma.sendJob.update({
      where: { id: job.id },
      data: {
        status: job.attempts + 1 >= job.maxAttempts ? SendJobStatus.failed : SendJobStatus.retrying,
        errorMessage: message,
      },
    });
    await emitWebhookEvent(job.workspaceId, "message_failed", {
      event: "message.failed",
      send_job_id: job.id,
      error: message,
    });
    throw error;
  }
}
