import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, requireContext } from "@/lib/api-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireContext(req, ["messages:read"]);
    const conversations = await prisma.conversation.findMany({
      where: { workspaceId: ctx.workspaceId },
      include: {
        contact: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ data: conversations });
  } catch (error) {
    return apiError(error);
  }
}
