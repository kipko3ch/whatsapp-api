import { PageHeader } from "@/components/dashboard/page-header";
import { prisma } from "@/lib/db";
import { requireDashboardSession } from "@/lib/dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CampaignActionButton, CampaignsClient } from "@/app/(dashboard)/bulk-campaigns/campaigns-client";

export default async function BulkCampaignsPage() {
  const session = await requireDashboardSession();
  const workspaceId = session.user.workspaceId;
  const [devices, campaigns] = await Promise.all([
    prisma.whatsappDevice.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" } }),
    prisma.bulkCampaign.findMany({
      where: { workspaceId },
      include: {
        device: true,
        _count: { select: { recipients: true, sendJobs: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Bulk Campaigns"
        description="Controlled bulk sending with per-device caps, randomized delays, retry tracking, opt-out checks, pause and resume."
      />
      <CampaignsClient devices={devices} />
      <Card className="mt-6">
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Device</Th>
                <Th>Recipients</Th>
                <Th>Rate</Th>
                <Th>Status</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <Td>{campaign.name}</Td>
                  <Td>{campaign.device?.name ?? "-"}</Td>
                  <Td>{campaign._count.recipients}</Td>
                  <Td>{campaign.rateLimitPerMinute}/min</Td>
                  <Td><Badge tone={campaign.status === "running" ? "green" : campaign.status === "paused" ? "yellow" : "neutral"}>{campaign.status}</Badge></Td>
                  <Td className="flex gap-2">
                    {campaign.status === "running" ? <CampaignActionButton id={campaign.id} action="pause" /> : null}
                    {campaign.status === "paused" ? <CampaignActionButton id={campaign.id} action="resume" /> : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
