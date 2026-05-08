"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Message = {
  id: string;
  contactPhone: string;
  direction: string;
  text: string | null;
  status: string;
  createdAt: Date;
};

export function InboxClient({ deviceId, phone }: { deviceId?: string; phone?: string }) {
  const [sending, setSending] = useState(false);

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deviceId || !phone) return;
    const form = new FormData(event.currentTarget);
    setSending(true);
    await fetch("/api/v1/messages/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        device_id: deviceId,
        to: phone,
        type: "text",
        text: form.get("text"),
      }),
    });
    location.reload();
  }

  return (
    <form onSubmit={send} className="mt-4 flex gap-2">
      <Textarea name="text" placeholder={deviceId && phone ? "Manual reply..." : "Select a conversation with a connected device"} disabled={!deviceId || !phone} />
      <Button type="submit" disabled={sending || !deviceId || !phone} className="h-auto">
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}

export function MessageBubble({ message }: { message: Message }) {
  const outbound = message.direction === "outbound";
  return (
    <div className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${outbound ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-800"}`}>
        <p>{message.text ?? "[media]"}</p>
        <p className={`mt-1 text-[11px] ${outbound ? "text-zinc-300" : "text-zinc-500"}`}>{message.status}</p>
      </div>
    </div>
  );
}
