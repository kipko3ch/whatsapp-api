import { PageHeader } from "@/components/dashboard/page-header";
import { prisma } from "@/lib/db";
import { requireDashboardSession } from "@/lib/dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function ContactsPage() {
  const session = await requireDashboardSession();
  const contacts = await prisma.contact.findMany({
    where: { workspaceId: session.user.workspaceId },
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  return (
    <>
      <PageHeader title="Contacts" description="Database-backed contact directory with opt-out state, tags, and last activity." />
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Phone</Th>
                <Th>Tags</Th>
                <Th>Opt-out</Th>
                <Th>Last message</Th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id}>
                  <Td>{contact.name ?? contact.pushName ?? "Unknown"}</Td>
                  <Td>{contact.phone}</Td>
                  <Td>{contact.tags.length ? contact.tags.join(", ") : "-"}</Td>
                  <Td>{contact.optedOutAt ? <Badge tone="red">opted out</Badge> : <Badge tone="green">allowed</Badge>}</Td>
                  <Td>{contact.lastMessageAt?.toLocaleString() ?? "-"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          {!contacts.length ? <p className="p-4 text-sm text-zinc-500">No contacts yet.</p> : null}
        </CardContent>
      </Card>
    </>
  );
}
