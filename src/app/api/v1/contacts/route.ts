import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, requireContext } from "@/lib/api-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireContext(req, ["contacts:read"]);
    const contacts = await prisma.contact.findMany({
      where: { workspaceId: ctx.workspaceId },
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
      take: 200,
    });

    return NextResponse.json({ data: contacts });
  } catch (error) {
    return apiError(error);
  }
}
