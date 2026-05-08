"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const events = ["message_received", "message_sent", "message_delivered", "message_read", "message_failed", "device_connected", "device_disconnected", "contact_updated", "campaign_completed"];

export function WebhooksClient() {
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch("/api/v1/webhooks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        url: form.get("url"),
        secret: form.get("secret") || undefined,
        events: events.filter((item) => form.get(item)),
      }),
    });
    location.reload();
  }

  return (
    <form onSubmit={create} className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="grid gap-3 lg:grid-cols-[180px_1fr_220px_auto]">
        <Input name="name" placeholder="n8n intake" required />
        <Input name="url" type="url" placeholder="https://n8n.example.com/webhook/..." required />
        <Input name="secret" placeholder="optional secret" />
        <Button type="submit">Create webhook</Button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((item) => (
          <label key={item} className="flex items-center gap-2 text-sm text-zinc-600">
            <input name={item} type="checkbox" defaultChecked={["message_received", "message_failed"].includes(item)} />
            {item.replaceAll("_", ".")}
          </label>
        ))}
      </div>
    </form>
  );
}

export function TestWebhookButton({ id }: { id: string }) {
  return (
    <Button type="button" variant="outline" onClick={() => void fetch(`/api/v1/webhooks/${id}/test`, { method: "POST" }).then(() => location.reload())}>
      Test
    </Button>
  );
}
