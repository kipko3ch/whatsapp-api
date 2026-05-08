import { PageHeader } from "@/components/dashboard/page-header";
import { prisma } from "@/lib/db";
import { requireDashboardSession } from "@/lib/dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ApiKeysClient, RevokeButton } from "@/app/(dashboard)/api-keys/api-keys-client";

export default async function ApiKeysPage() {
  const session = await requireDashboardSession();
  const keys = await prisma.apiKey.findMany({
    where: { workspaceId: session.user.workspaceId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageHeader title="API Keys" description="Create and revoke scoped keys. Plain keys are shown once and only hashed keys are persisted." />
      <ApiKeysClient />
      <Card className="mt-6">
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Prefix</Th>
                <Th>Scopes</Th>
                <Th>Last used</Th>
                <Th>Status</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.id}>
                  <Td>{key.name}</Td>
                  <Td>{key.keyPrefix}</Td>
                  <Td>{key.scopes.join(", ")}</Td>
                  <Td>{key.lastUsedAt?.toLocaleString() ?? "-"}</Td>
                  <Td>{key.revokedAt ? <Badge tone="red">revoked</Badge> : <Badge tone="green">active</Badge>}</Td>
                  <Td>{key.revokedAt ? null : <RevokeButton id={key.id} />}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
