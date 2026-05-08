import { CampaignStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { normalizePhone } from "@/lib/phone";
import { sendQueue, startWorkers } from "@/lib/jobs/queues";

function randomDelay(minMs: number, maxMs: number) {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

export async function enqueueCampaign(campaignId: string) {
  startWorkers();

  const campaign = await prisma.bulkCampaign.findUnique({
    where: { id: campaignId },
    include: { recipients: true },
  });

  if (!campaign) throw new Error("Campaign not found.");
  if (!campaign.deviceId) throw new Error("A campaign device is required for this MVP.");

  await prisma.bulkCampaign.update({
    where: { id: campaign.id },
    data: { status: CampaignStatus.running, startedAt: new Date() },
  });

  let accumulatedDelay = 0;
  const rateLimitFloor = Math.ceil(60_000 / Math.max(campaign.rateLimitPerMinute, 1));
  const minDelay = Math.max(campaign.delayMinMs || env().DEFAULT_MESSAGE_DELAY_MIN_MS, rateLimitFloor);
  const maxDelay = campaign.delayMaxMs || env().DEFAULT_MESSAGE_DELAY_MAX_MS;

  for (const recipient of campaign.recipients) {
    const phone = normalizePhone(recipient.phone);
    accumulatedDelay += randomDelay(minDelay, maxDelay);

    const sendJob = await prisma.sendJob.create({
      data: {
        workspaceId: campaign.workspaceId,
        deviceId: campaign.deviceId,
        campaignId: campaign.id,
        recipientPhone: phone,
        payload: {
          type: "text",
          text: interpolate(campaign.messageText ?? "", recipient.variables as Record<string, unknown> | null),
        },
        runAt: new Date(Date.now() + accumulatedDelay),
        maxAttempts: campaign.maxRetries + 1,
      },
    });

    await prisma.bulkCampaignRecipient.update({
      where: { id: recipient.id },
      data: { status: "queued" },
    });

    await sendQueue.add(
      "send-message",
      { sendJobId: sendJob.id },
      {
        delay: accumulatedDelay,
        attempts: campaign.maxRetries + 1,
        backoff: { type: "exponential", delay: 30_000 },
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    );
  }
}

function interpolate(template: string, variables?: Record<string, unknown> | null) {
  if (!variables) return template;

  return Object.entries(variables).reduce((text, [key, value]) => {
    return text.replaceAll(`{{${key}}}`, String(value ?? ""));
  }, template);
}
