import { DeliveryStatus, Prisma, type WebhookEvent } from "@prisma/client";
import { prisma } from "@/lib/db";
import { signPayload } from "@/lib/crypto";
import { startWorkers, webhookQueue } from "@/lib/jobs/queues";

export async function emitWebhookEvent(workspaceId: string, event: WebhookEvent, payload: Record<string, unknown>) {
  startWorkers();

  const webhooks = await prisma.webhook.findMany({
    where: {
      workspaceId,
      active: true,
      events: { has: event },
    },
  });

  for (const webhook of webhooks) {
    const data = JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue;
    const body: Prisma.InputJsonObject = {
      id: crypto.randomUUID(),
      event: typeof payload.event === "string" ? payload.event : event.replaceAll("_", "."),
      created_at: new Date().toISOString(),
      data,
    };
    const signature = signPayload(body, webhook.secret);
    const delivery = await prisma.webhookDelivery.create({
      data: {
        workspaceId,
        webhookId: webhook.id,
        event,
        payload: body,
        signature,
        status: DeliveryStatus.pending,
      },
    });

    await webhookQueue.add(
      "deliver-webhook",
      { deliveryId: delivery.id },
      {
        attempts: 5,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    );
  }
}

export async function deliverWebhook(deliveryId: string) {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { webhook: true },
  });

  if (!delivery?.webhook) return;

  const payload = delivery.payload;
  const signature = signPayload(payload, delivery.webhook.secret);

  try {
    const response = await fetch(delivery.webhook.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "Baileys-API-Platform/1.0",
        "x-webhook-id": delivery.webhook.id,
        "x-webhook-event": delivery.event.replaceAll("_", "."),
        "x-webhook-signature": `sha256=${signature}`,
      },
      body: JSON.stringify(payload),
    });

    const responseBody = (await response.text()).slice(0, 4000);
    const delivered = response.ok;

    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: delivered ? DeliveryStatus.delivered : DeliveryStatus.retrying,
        attempt: { increment: 1 },
        responseCode: response.status,
        responseBody,
        deliveredAt: delivered ? new Date() : null,
        nextAttemptAt: delivered ? null : new Date(Date.now() + 60_000),
      },
    });

    await prisma.webhook.update({
      where: { id: delivery.webhook.id },
      data: delivered ? { lastSuccessAt: new Date() } : { lastFailureAt: new Date() },
    });

    if (!delivered) {
      throw new Error(`Webhook failed with HTTP ${response.status}`);
    }
  } catch (error) {
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: DeliveryStatus.retrying,
        attempt: { increment: 1 },
        errorMessage: error instanceof Error ? error.message : "Webhook delivery failed.",
        nextAttemptAt: new Date(Date.now() + 60_000),
      },
    });

    throw error;
  }
}
