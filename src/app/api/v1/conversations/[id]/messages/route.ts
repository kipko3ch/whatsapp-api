import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, requireContext } from "@/lib/api-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireContext(req, ["messages:read"]);
    const conversation = await prisma.conversation.findFirst({
      where: { id: params.id, workspaceId: ctx.workspaceId },
    });

    if (!conversation) {
      return NextResponse.json({ error: { code: "not_found", message: "Conversation not found." } }, { status: 404 });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: conversation.id, workspaceId: ctx.workspaceId },
      include: { media: true },
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    return NextResponse.json({ data: messages });
  } catch (error) {
    return apiError(error);
  }
}
