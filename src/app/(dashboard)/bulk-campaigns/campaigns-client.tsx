"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Device = { id: string; name: string; status: string };

export function CampaignsClient({ devices }: { devices: Device[] }) {
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const recipients = String(form.get("recipients") ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [phone, name] = line.split(",").map((item) => item.trim());
        return { phone, name };
      });

    await fetch("/api/v1/bulk-campaigns", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        device_id: form.get("device_id") || undefined,
        message_text: form.get("message_text"),
        recipients,
        rate_limit_per_minute: Number(form.get("rate_limit_per_minute") || 10),
        delay_min_ms: Number(form.get("delay_min_ms") || 5000),
        delay_max_ms: Number(form.get("delay_max_ms") || 15000),
      }),
    });
    location.reload();
  }

  return (
    <form onSubmit={create} className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 lg:grid-cols-2">
      <div className="space-y-3">
        <Input name="name" placeholder="May follow-up" required />
        <select name="device_id" className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm" required>
          <option value="">Choose device</option>
          {devices.map((device) => (
            <option key={device.id} value={device.id}>
              {device.name} ({device.status})
            </option>
          ))}
        </select>
        <Textarea name="message_text" placeholder="Hello {{name}}, quick update..." required />
      </div>
      <div className="space-y-3">
        <Textarea name="recipients" placeholder={"255712345678, Amina\n255722345678, Joseph"} required />
        <div className="grid gap-3 sm:grid-cols-3">
          <Input name="rate_limit_per_minute" type="number" defaultValue="10" min="1" max="60" />
          <Input name="delay_min_ms" type="number" defaultValue="5000" min="1000" />
          <Input name="delay_max_ms" type="number" defaultValue="15000" min="1000" />
        </div>
        <Button type="submit">Create controlled campaign</Button>
      </div>
    </form>
  );
}

export function CampaignActionButton({ id, action }: { id: string; action: "pause" | "resume" }) {
  return (
    <Button type="button" variant="outline" onClick={() => void fetch(`/api/v1/bulk-campaigns/${id}/${action}`, { method: "POST" }).then(() => location.reload())}>
      {action === "pause" ? "Pause" : "Resume"}
    </Button>
  );
}
