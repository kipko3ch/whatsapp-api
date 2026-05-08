import Link from "next/link";
import { Activity, BookOpen, Contact, Inbox, KeyRound, Megaphone, PlugZap, Smartphone, Webhook } from "lucide-react";

const items = [
  { href: "/overview", label: "Overview", icon: Activity },
  { href: "/devices", label: "Devices", icon: Smartphone },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/contacts", label: "Contacts", icon: Contact },
  { href: "/api-keys", label: "API Keys", icon: KeyRound },
  { href: "/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/bulk-campaigns", label: "Bulk Campaigns", icon: Megaphone },
  { href: "/docs", label: "Docs", icon: BookOpen },
];

export function Sidebar({ workspaceName }: { workspaceName: string }) {
  return (
    <aside className="border-b border-zinc-200 bg-white md:fixed md:inset-y-0 md:left-0 md:w-64 md:border-b-0 md:border-r">
      <div className="flex h-16 items-center gap-2 border-b border-zinc-100 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-950 text-white">
          <PlugZap className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-950">Baileys API</p>
          <p className="truncate text-xs text-zinc-500">{workspaceName}</p>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto p-3 md:block md:space-y-1 md:overflow-visible">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
