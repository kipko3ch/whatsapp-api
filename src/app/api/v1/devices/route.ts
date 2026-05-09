import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { apiError, getRequestMeta, requireContext } from "@/lib/api-context";
import { auditLog } from "@/lib/audit";
import { createDeviceSchema, updateDeviceLimitSchema } from "@/lib/validators/devices";
import { exposeApiDeviceId } from "@/lib/whatsapp/devices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireContext(req, ["devices:read"]);
    const devices = await prisma.whatsappDevice.findMany({
      where: { workspaceId: ctx.workspaceId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: devices.map(exposeApiDeviceId) });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireContext(req, ["devices:write"]);
    const body = createDeviceSchema.parse(await req.json());
    const device = await prisma.whatsappDevice.create({
      data: {
        workspaceId: ctx.workspaceId,
        name: body.name,
        dailySendLimit: body.daily_send_limit ?? env().DEFAULT_DAILY_SEND_LIMIT,
      },
    });

    await auditLog({
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      actorType: ctx.actorType,
      action: "device.created",
      targetType: "whatsapp_device",
      targetId: device.id,
      ...getRequestMeta(req),
    });

    return NextResponse.json({ data: exposeApiDeviceId(device) }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requireContext(req, ["devices:write"]);
    const deviceId = req.nextUrl.searchParams.get("id");
    if (!deviceId) return NextResponse.json({ error: { code: "missing_id", message: "Missing device id." } }, { status: 400 });

    const body = updateDeviceLimitSchema.parse(await req.json());
    const device = await prisma.whatsappDevice.update({
      where: { id: deviceId, workspaceId: ctx.workspaceId },
      data: { dailySendLimit: body.daily_send_limit },
    });

    return NextResponse.json({ data: exposeApiDeviceId(device) });
  } catch (error) {
    return apiError(error);
  }
}
