import { getServerSession } from "next-auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { hashApiKey } from "@/lib/crypto";
import { authOptions } from "@/lib/auth";

export type RequestContext = {
  workspaceId: string;
  userId?: string | null;
  apiKeyId?: string | null;
  actorType: "user" | "api_key";
  scopes: string[];
};

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function apiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "The request body or query parameters are invalid.",
          issues: error.issues,
        },
      },
      { status: 400 },
    );
  }

  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }

  console.error(error);
  return NextResponse.json(
    { error: { code: "internal_error", message: "Something went wrong." } },
    { status: 500 },
  );
}

export async function requireContext(req: NextRequest, requiredScopes: string[] = []) {
  const authHeader = req.headers.get("authorization");
  const rawKey = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (rawKey) {
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        keyHash: hashApiKey(rawKey),
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    if (!apiKey) {
      throw new ApiError(401, "invalid_api_key", "The API key is invalid or revoked.");
    }

    const missing = requiredScopes.filter((scope) => !apiKey.scopes.includes(scope));
    if (missing.length) {
      throw new ApiError(403, "missing_scope", `Missing required scope: ${missing.join(", ")}`);
    }

    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      workspaceId: apiKey.workspaceId,
      apiKeyId: apiKey.id,
      actorType: "api_key",
      scopes: apiKey.scopes,
    } satisfies RequestContext;
  }

  const session = await getServerSession(authOptions);
  const workspaceId = (session?.user as { workspaceId?: string } | undefined)?.workspaceId;
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!workspaceId || !userId) {
    throw new ApiError(401, "unauthorized", "Sign in or provide a Bearer API key.");
  }

  return {
    workspaceId,
    userId,
    actorType: "user",
    scopes: ["*"],
  } satisfies RequestContext;
}

export function getRequestMeta(req: NextRequest) {
  return {
    ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: req.headers.get("user-agent"),
  };
}
