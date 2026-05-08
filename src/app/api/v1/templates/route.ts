import { NextResponse, type NextRequest } from "next/server";
import { apiError, requireContext } from "@/lib/api-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireContext(req, ["messages:read"]);
    return NextResponse.json({
      data: [],
      note: "Baileys does not provide official WhatsApp template management. Keep templates in your app database or switch this provider to the official Cloud API later.",
    });
  } catch (error) {
    return apiError(error);
  }
}
