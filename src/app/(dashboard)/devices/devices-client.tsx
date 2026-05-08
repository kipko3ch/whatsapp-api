"use client";

import { useState } from "react";
import { RefreshCcw, LogOut, Plus, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Device = {
  id: string;
  name: string;
  phoneNumber: string | null;
  status: string;
  dailySendLimit: number;
  currentDailySentCount: number;
};

export function DevicesClient({ devices }: { devices: Device[] }) {
  const [qr, setQr] = useState<{ deviceId: string; image: string | null } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function createDevice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy("create");
    await fetch("/api/v1/devices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        daily_send_limit: Number(form.get("daily_send_limit") || 250),
      }),
    });
    location.reload();
  }

  async function connect(id: string) {
    setBusy(id);
    await fetch(`/api/v1/devices/${id}/connect`, { method: "POST" });
    const response = await fetch(`/api/v1/devices/${id}/qr`);
    const json = await response.json();
    setQr({ deviceId: id, image: json.data?.qr_image ?? null });
    setBusy(null);
  }

  async function disconnect(id: string, logout = false) {
    setBusy(id);
    await fetch(`/api/v1/devices/${id}/disconnect`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ logout }),
    });
    location.reload();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={createDevice} className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-[1fr_160px_auto]">
        <Input name="name" placeholder="Sales line" required />
        <Input name="daily_send_limit" type="number" min="1" defaultValue="250" />
        <Button type="submit" disabled={busy === "create"}>
          <Plus className="mr-2 h-4 w-4" />
          Add device
        </Button>
      </form>
      <div className="grid gap-4 lg:grid-cols-2">
        {devices.map((device) => (
          <div key={device.id} className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">{device.name}</p>
                <p className="text-sm text-zinc-500">{device.phoneNumber ?? "Not paired"}</p>
                <p className="mt-2 text-xs text-zinc-500">
                  {device.currentDailySentCount}/{device.dailySendLimit} sent today
                </p>
              </div>
              <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">{device.status}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" onClick={() => connect(device.id)} disabled={busy === device.id}>
                <QrCode className="mr-2 h-4 w-4" />
                Pair / reconnect
              </Button>
              <Button type="button" variant="outline" onClick={() => disconnect(device.id)}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Disconnect
              </Button>
              <Button type="button" variant="danger" onClick={() => disconnect(device.id, true)}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
            {qr?.deviceId === device.id ? (
              <div className="mt-4 rounded-md border border-zinc-100 p-3">
                {qr.image ? <img src={qr.image} alt="WhatsApp pairing QR" className="h-56 w-56" /> : <p className="text-sm text-zinc-500">QR is not available yet. Try refresh in a few seconds.</p>}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
