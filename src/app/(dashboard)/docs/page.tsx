import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const sendExample = `curl -X POST https://your-domain.com/api/v1/messages/send \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "device_id": "device_xxx",
    "to": "255712345678",
    "type": "text",
    "text": "Hello from the API"
  }'`;

const webhookExample = `{
  "id": "evt_...",
  "event": "message.received",
  "created_at": "2026-05-08T10:00:00.000Z",
  "data": {
    "message": { "direction": "inbound", "text": "Hi" },
    "contact": { "phone": "255712345678" }
  }
}`;

export default function DocsPage() {
  return (
    <>
      <PageHeader title="Integration Docs" description="Cloud-API-like patterns with a clearly unofficial Baileys provider under the hood." />
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-zinc-600">
            <p>1. Add a device in the dashboard and scan the QR code with WhatsApp linked devices.</p>
            <p>2. Create an API key with the scopes your integration needs.</p>
            <p>3. Send messages through <code>/api/v1/messages/send</code> and receive inbound events through webhooks.</p>
            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
              Baileys is unofficial. Abuse, high-volume spam, or suspicious automation can cause logouts, restrictions, or bans. Use opt-outs, human takeover, and conservative rate limits.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-zinc-600">
            <p>Use a Bearer API key. The platform stores only a peppered SHA-256 hash of each key.</p>
            <pre className="mt-3 overflow-x-auto rounded-md bg-zinc-950 p-4 text-xs text-white">Authorization: Bearer YOUR_API_KEY</pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Send Message</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md bg-zinc-950 p-4 text-xs text-white">{sendExample}</pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Receive Messages Via Webhook</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-zinc-600">
            <p>Subscribe to <code>message.received</code>. Deliveries include <code>x-webhook-signature: sha256=...</code> using the webhook secret.</p>
            <pre className="overflow-x-auto rounded-md bg-zinc-950 p-4 text-xs text-white">{webhookExample}</pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>n8n Integration Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-600">
            <p>{"WhatsApp message received -> webhook to n8n -> AI qualification -> n8n calls send message API -> message saved to database."}</p>
            <p>Use the n8n Webhook node URL as the webhook target. Verify the HMAC header in a Function node when needed.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Error Codes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm text-zinc-600 md:grid-cols-2">
            <p><code>invalid_api_key</code>: API key is missing, invalid, revoked, or expired.</p>
            <p><code>missing_scope</code>: Key lacks a required scope.</p>
            <p><code>device_not_found</code>: Device is not in the workspace.</p>
            <p><code>recipient_opted_out</code>: Recipient cannot be messaged.</p>
            <p><code>recipient_blacklisted</code>: Number is blocked by workspace policy.</p>
            <p><code>internal_error</code>: Unexpected server-side failure.</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
