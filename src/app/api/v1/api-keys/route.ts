import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, apiError, getRequestMeta, requireContext } from "@/lib/api-context";
import { auditLog } from "@/lib/audit";
import { generateApiKey } from "@/lib/crypto";
import { createApiKeySchema } from "@/lib/validators/api-keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireContext(req, []);
    if (ctx.actorType === "api_key") throw new ApiError(403, "dashboard_only", "API keys can only be managed from the dashboard.");
    const keys = await prisma.apiKey.findMany({
      where: { workspaceId: ctx.workspaceId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        revokedAt: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: keys });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireContext(req, []);
    if (ctx.actorType === "api_key") throw new ApiError(403, "dashboard_only", "API keys can only be managed from the dashboard.");
    const body = createApiKeySchema.parse(await req.json());
    const generated = generateApiKey();

    const apiKey = await prisma.apiKey.create({
      data: {
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        name: body.name,
        scopes: body.scopes,
        keyPrefix: generated.prefix,
        keyHash: generated.hash,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        createdAt: true,
      },
    });

    await auditLog({
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      actorType: ctx.actorType,
      action: "api_key.created",
      targetType: "api_key",
      targetId: apiKey.id,
      ...getRequestMeta(req),
    });

    return NextResponse.json({ data: { ...apiKey, key: generated.key } }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await requireContext(req, []);
    if (ctx.actorType === "api_key") throw new ApiError(403, "dashboard_only", "API keys can only be managed from the dashboard.");
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: { code: "missing_id", message: "Missing API key id." } }, { status: 400 });

    const key = await prisma.apiKey.update({
      where: { id, workspaceId: ctx.workspaceId },
      data: { revokedAt: new Date() },
    });

    await auditLog({
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      actorType: ctx.actorType,
      action: "api_key.revoked",
      targetType: "api_key",
      targetId: key.id,
      ...getRequestMeta(req),
    });

    return NextResponse.json({ data: key });
  } catch (error) {
    return apiError(error);
  }
}
