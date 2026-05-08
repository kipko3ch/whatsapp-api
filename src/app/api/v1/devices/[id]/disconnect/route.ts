import { NextResponse, type NextRequest } from "next/server";
import { apiError, requireContext } from "@/lib/api-context";
import { prisma } from "@/lib/db";
import { whatsappProvider } from "@/lib/whatsapp/manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireContext(req, ["devices:write"]);
    const device = await prisma.whatsappDevice.findFirst({
      where: { id: params.id, workspaceId: ctx.workspaceId },
    });

    if (!device) {
      return NextResponse.json({ error: { code: "not_found", message: "Device not found." } }, { status: 404 });
    }

    const { logout = false } = await req.json().catch(() => ({}));
    await whatsappProvider().disconnectDevice(device.id, logout);
    const updated = await prisma.whatsappDevice.findUnique({ where: { id: device.id } });
    return NextResponse.json({ data: updated });
  } catch (error) {
    return apiError(error);
  }
}
