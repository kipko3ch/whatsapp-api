import { prisma } from "@/lib/db";
import { requireDashboardSession } from "@/lib/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";

export default async function OverviewPage() {
  const session = await requireDashboardSession();
  const workspaceId = session.user.workspaceId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [connectedDevices, sentToday, receivedToday, failedToday, activeCampaigns, devices, deliveries] = await Promise.all([
    prisma.whatsappDevice.count({ where: { workspaceId, status: "connected" } }),
    prisma.message.count({ where: { workspaceId, direction: "outbound", createdAt: { gte: today } } }),
    prisma.message.count({ where: { workspaceId, direction: "inbound", createdAt: { gte: today } } }),
    prisma.message.count({ where: { workspaceId, status: "failed", createdAt: { gte: today } } }),
    prisma.bulkCampaign.count({ where: { workspaceId, status: { in: ["running", "scheduled", "paused"] } } }),
    prisma.whatsappDevice.findMany({ where: { workspaceId }, orderBy: { updatedAt: "desc" }, take: 5 }),
    prisma.webhookDelivery.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const stats = [
    ["Connected devices", connectedDevices],
    ["Today sent", sentToday],
    ["Received", receivedToday],
    ["Failed sends", failedToday],
    ["Active campaigns", activeCampaigns],
  ];

  return (
    <>
      <PageHeader
        title="Overview"
        description="Operational view of connected Baileys devices, delivery health, and controlled campaign activity."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map(([label, value]) => (
          <Card key={label}>
            <CardContent>
              <p className="text-xs font-medium uppercase text-zinc-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Device Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {devices.map((device) => (
              <div key={device.id} className="flex items-center justify-between rounded-md border border-zinc-100 p-3">
                <div>
                  <p className="text-sm font-medium">{device.name}</p>
                  <p className="text-xs text-zinc-500">{device.phoneNumber ?? "Not paired"}</p>
                </div>
                <Badge tone={device.status === "connected" ? "green" : device.status === "qr_required" ? "yellow" : "neutral"}>
                  {device.status}
                </Badge>
              </div>
            ))}
            {!devices.length ? <p className="text-sm text-zinc-500">No devices yet.</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Webhook Deliveries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {deliveries.map((delivery) => (
              <div key={delivery.id} className="flex items-center justify-between rounded-md border border-zinc-100 p-3">
                <div>
                  <p className="text-sm font-medium">{delivery.event.replaceAll("_", ".")}</p>
                  <p className="text-xs text-zinc-500">HTTP {delivery.responseCode ?? "pending"}</p>
                </div>
                <Badge tone={delivery.status === "delivered" ? "green" : delivery.status === "failed" ? "red" : "yellow"}>
                  {delivery.status}
                </Badge>
              </div>
            ))}
            {!deliveries.length ? <p className="text-sm text-zinc-500">No webhook deliveries yet.</p> : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
