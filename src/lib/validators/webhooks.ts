import { z } from "zod";

export const webhookEvents = [
  "message_received",
  "message_sent",
  "message_delivered",
  "message_read",
  "message_failed",
  "device_connected",
  "device_disconnected",
  "contact_updated",
  "campaign_completed",
] as const;

export const createWebhookSchema = z.object({
  name: z.string().min(2).max(80),
  url: z.string().url(),
  events: z.array(z.enum(webhookEvents)).min(1),
  secret: z.string().min(16).optional(),
});
