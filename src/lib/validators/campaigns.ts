import { z } from "zod";

export const createCampaignSchema = z.object({
  name: z.string().min(2).max(120),
  device_id: z.string().min(1).optional(),
  message_text: z.string().min(1).max(4096),
  recipients: z
    .array(
      z.object({
        phone: z.string().min(8),
        name: z.string().optional(),
        variables: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .min(1)
    .max(5000),
  rate_limit_per_minute: z.coerce.number().int().min(1).max(60).default(10),
  delay_min_ms: z.coerce.number().int().min(1000).default(5000),
  delay_max_ms: z.coerce.number().int().min(1000).default(15000),
  scheduled_at: z.coerce.date().optional(),
});
