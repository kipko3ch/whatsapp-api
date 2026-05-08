import { PageHeader } from "@/components/dashboard/page-header";
import { prisma } from "@/lib/db";
import { requireDashboardSession } from "@/lib/dashboard";
import { DevicesClient } from "@/app/(dashboard)/devices/devices-client";

export default async function DevicesPage() {
  const session = await requireDashboardSession();
  const devices = await prisma.whatsappDevice.findMany({
    where: { workspaceId: session.user.workspaceId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageHeader
        title="Devices"
        description="Add Baileys-powered WhatsApp linked devices, show QR pairing, reconnect, logout, and configure daily send limits."
      />
      <DevicesClient devices={devices} />
    </>
  );
}
