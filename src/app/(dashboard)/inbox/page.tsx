import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { prisma } from "@/lib/db";
import { requireDashboardSession } from "@/lib/dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InboxClient, MessageBubble } from "@/app/(dashboard)/inbox/inbox-client";

export default async function InboxPage({ searchParams }: { searchParams: { conversation?: string } }) {
  const session = await requireDashboardSession();
  const workspaceId = session.user.workspaceId;
  const conversations = await prisma.conversation.findMany({
    where: { workspaceId },
    include: {
      contact: true,
      device: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
  });
  const selected = searchParams.conversation ?? conversations[0]?.id;
  const messages = selected
    ? await prisma.message.findMany({
        where: { workspaceId, conversationId: selected },
        orderBy: { createdAt: "asc" },
        take: 200,
      })
    : [];
  const conversation = conversations.find((item) => item.id === selected);

  return (
    <>
      <PageHeader title="Inbox" description="WhatsApp-style conversation view with manual replies and a human takeover flag." />
      <div className="grid min-h-[680px] gap-4 lg:grid-cols-[340px_1fr]">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {conversations.map((item) => (
              <Link key={item.id} href={`/inbox?conversation=${item.id}`} className="block border-b border-zinc-100 p-4 hover:bg-zinc-50">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium">{item.title ?? item.contactPhone}</p>
                  {item.humanTakeover ? <Badge tone="blue">human</Badge> : null}
                </div>
                <p className="mt-1 truncate text-xs text-zinc-500">{item.messages[0]?.text ?? "No messages"}</p>
              </Link>
            ))}
            {!conversations.length ? <p className="p-4 text-sm text-zinc-500">No conversations yet.</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex h-full flex-col">
            <div className="border-b border-zinc-100 pb-3">
              <p className="font-medium">{conversation?.title ?? "No conversation selected"}</p>
              <p className="text-sm text-zinc-500">{conversation?.contactPhone}</p>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto py-4">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </div>
            <InboxClient deviceId={conversation?.deviceId} phone={conversation?.contactPhone} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
