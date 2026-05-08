import { nanoid } from "nanoid";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, requireContext } from "@/lib/api-context";
import { createWebhookSchema } from "@/lib/validators/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireContext(req, ["webhooks:manage"]);
    const webhooks = await prisma.webhook.findMany({
      where: { workspaceId: ctx.workspaceId },
      include: {
        deliveries: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: webhooks });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireContext(req, ["webhooks:manage"]);
    const body = createWebhookSchema.parse(await req.json());
    const webhook = await prisma.webhook.create({
      data: {
        workspaceId: ctx.workspaceId,
        name: body.name,
        url: body.url,
        events: body.events,
        secret: body.secret ?? `whsec_${nanoid(32)}`,
      },
    });

    return NextResponse.json({ data: webhook }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await requireContext(req, ["webhooks:manage"]);
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: { code: "missing_id", message: "Missing webhook id." } }, { status: 400 });

    await prisma.webhook.delete({ where: { id, workspaceId: ctx.workspaceId } });
    return NextResponse.json({ data: { id, deleted: true } });
  } catch (error) {
    return apiError(error);
  }
}
