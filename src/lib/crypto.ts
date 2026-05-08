import crypto from "node:crypto";
import { nanoid } from "nanoid";
import { env } from "@/lib/env";

export function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function hashApiKey(rawKey: string) {
  return sha256(`${rawKey}.${env().API_KEY_PEPPER}`);
}

export function generateApiKey() {
  const id = nanoid(10);
  const secret = nanoid(36);
  const key = `waba_sk_${id}_${secret}`;

  return {
    key,
    prefix: `waba_sk_${id}`,
    hash: hashApiKey(key),
  };
}

export function signPayload(payload: unknown, secret: string) {
  const body = typeof payload === "string" ? payload : JSON.stringify(payload);

  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}
