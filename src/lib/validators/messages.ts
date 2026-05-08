import { z } from "zod";

const mediaSchema = z.object({
  url: z.string().url(),
  mime_type: z.string().optional(),
  filename: z.string().optional(),
  caption: z.string().optional(),
});

export const sendMessageSchema = z.discriminatedUnion("type", [
  z.object({
    device_id: z.string().min(1),
    to: z.string().min(8),
    type: z.literal("text"),
    text: z.string().min(1).max(4096),
  }),
  z.object({
    device_id: z.string().min(1),
    to: z.string().min(8),
    type: z.enum(["image", "document", "audio", "video"]),
    media: mediaSchema,
  }),
  z.object({
    device_id: z.string().min(1),
    to: z.string().min(8),
    type: z.literal("location"),
    location: z.object({
      latitude: z.number(),
      longitude: z.number(),
      name: z.string().optional(),
      address: z.string().optional(),
    }),
  }),
  z.object({
    device_id: z.string().min(1),
    to: z.string().min(8),
    type: z.literal("contact"),
    contact: z.object({
      full_name: z.string().min(1),
      phone: z.string().min(8),
    }),
  }),
]);

export const messageFilterSchema = z.object({
  device_id: z.string().optional(),
  contact_phone: z.string().optional(),
  direction: z.enum(["inbound", "outbound"]).optional(),
  status: z.enum(["queued", "sending", "sent", "delivered", "read", "received", "failed"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
