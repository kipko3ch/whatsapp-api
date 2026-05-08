import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, requireContext } from "@/lib/api-context";
import { normalizePhone } from "@/lib/phone";
import { messageFilterSchema } from "@/lib/validators/messages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireContext(req, ["messages:read"]);
    const filters = messageFilterSchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const messages = await prisma.message.findMany({
      where: {
        workspaceId: ctx.workspaceId,
        deviceId: filters.device_id,
        contactPhone: filters.contact_phone ? normalizePhone(filters.contact_phone) : undefined,
        direction: filters.direction,
        status: filters.status,
        createdAt: {
          gte: filters.from,
          lte: filters.to,
        },
      },
      include: { media: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ data: messages });
  } catch (error) {
    return apiError(error);
  }
}
