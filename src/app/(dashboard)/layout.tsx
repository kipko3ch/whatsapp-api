import { Sidebar } from "@/components/dashboard/sidebar";
import { requireDashboardSession } from "@/lib/dashboard";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireDashboardSession();

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <Sidebar workspaceName={session.user.workspaceName} />
      <main className="px-4 py-6 md:ml-64 md:px-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
