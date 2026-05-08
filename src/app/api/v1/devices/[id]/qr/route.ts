import QRCode from "qrcode";
import { NextResponse, type NextRequest } from "next/server";
import { apiError, requireContext } from "@/lib/api-context";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireContext(req, ["devices:read"]);
    const device = await prisma.whatsappDevice.findFirst({
      where: { id: params.id, workspaceId: ctx.workspaceId },
      select: { id: true, status: true, lastQr: true, lastQrAt: true },
    });

    if (!device) {
      return NextResponse.json({ error: { code: "not_found", message: "Device not found." } }, { status: 404 });
    }

    const qr_image = device.lastQr ? await QRCode.toDataURL(device.lastQr) : null;
    return NextResponse.json({ data: { ...device, qr_image } });
  } catch (error) {
    return apiError(error);
  }
}
