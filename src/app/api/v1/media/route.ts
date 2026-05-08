import { NextResponse, type NextRequest } from "next/server";
import { apiError, requireContext } from "@/lib/api-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireContext(req, ["messages:read"]);
    return NextResponse.json({
      data: [],
      note: "Media metadata is persisted with messages. Upload/storage adapters are intentionally left pluggable for S3, Supabase Storage, or R2.",
    });
  } catch (error) {
    return apiError(error);
  }
}
