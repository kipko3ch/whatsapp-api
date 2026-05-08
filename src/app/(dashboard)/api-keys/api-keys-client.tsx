"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const scopes = ["messages:read", "messages:send", "contacts:read", "contacts:write", "devices:read", "devices:write", "webhooks:manage", "campaigns:manage"];

export function ApiKeysClient() {
  const [newKey, setNewKey] = useState<string | null>(null);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const selected = scopes.filter((scope) => form.get(scope));
    const response = await fetch("/api/v1/api-keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: form.get("name"), scopes: selected }),
    });
    const json = await response.json();
    setNewKey(json.data?.key ?? null);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={create} className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <Input name="name" placeholder="n8n production" required />
          <Button type="submit">Create key</Button>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {scopes.map((scope) => (
            <label key={scope} className="flex items-center gap-2 text-sm text-zinc-600">
              <input name={scope} type="checkbox" defaultChecked={["messages:read", "messages:send"].includes(scope)} />
              {scope}
            </label>
          ))}
        </div>
      </form>
      {newKey ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">Copy this API key now. It is stored only as a hash.</p>
          <code className="mt-2 block break-all rounded-md bg-white p-3 text-sm text-zinc-900">{newKey}</code>
        </div>
      ) : null}
    </div>
  );
}

export function RevokeButton({ id }: { id: string }) {
  return (
    <Button type="button" variant="outline" onClick={() => void fetch(`/api/v1/api-keys/${id}/revoke`, { method: "POST" }).then(() => location.reload())}>
      Revoke
    </Button>
  );
}
