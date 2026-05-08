import { z } from "zod";

export const createDeviceSchema = z.object({
  name: z.string().min(2).max(80),
  daily_send_limit: z.coerce.number().int().min(1).max(10000).optional(),
});

export const updateDeviceLimitSchema = z.object({
  daily_send_limit: z.coerce.number().int().min(1).max(10000),
});
