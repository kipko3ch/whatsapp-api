import { z } from "zod";

export const apiKeyScopes = [
  "messages:read",
  "messages:send",
  "contacts:read",
  "contacts:write",
  "devices:read",
  "devices:write",
  "webhooks:manage",
  "campaigns:manage",
] as const;

export const createApiKeySchema = z.object({
  name: z.string().min(2).max(80),
  scopes: z.array(z.enum(apiKeyScopes)).min(1),
});
