import { PageHeader } from "@/components/dashboard/page-header";
import { prisma } from "@/lib/db";
import { requireDashboardSession } from "@/lib/dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { WebhooksClient, TestWebhookButton } from "@/app/(dashboard)/webhooks/webhooks-client";

export default async function WebhooksPage() {
  const session = await requireDashboardSession();
  const webhooks = await prisma.webhook.findMany({
    where: { workspaceId: session.user.workspaceId },
    include: { deliveries: { orderBy: { createdAt: "desc" }, take: 3 } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageHeader title="Webhooks" description="Configure n8n-friendly webhook endpoints. Payloads are signed with HMAC and retries are logged." />
      <WebhooksClient />
      <Card className="mt-6">
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>URL</Th>
                <Th>Events</Th>
                <Th>Last deliveries</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {webhooks.map((webhook) => (
                <tr key={webhook.id}>
                  <Td>{webhook.name}</Td>
                  <Td className="max-w-sm truncate">{webhook.url}</Td>
                  <Td>{webhook.events.map((event) => event.replaceAll("_", ".")).join(", ")}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {webhook.deliveries.map((delivery) => (
                        <Badge key={delivery.id} tone={delivery.status === "delivered" ? "green" : "yellow"}>
                          {delivery.responseCode ?? delivery.status}
                        </Badge>
                      ))}
                    </div>
                  </Td>
                  <Td>
                    <TestWebhookButton id={webhook.id} />
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
