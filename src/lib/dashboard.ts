import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export async function requireDashboardSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.workspaceId) redirect("/login");
  return session;
}
