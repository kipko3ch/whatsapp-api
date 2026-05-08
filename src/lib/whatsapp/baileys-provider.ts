/* eslint-disable @typescript-eslint/no-explicit-any */
import pino from "pino";
import { MessageType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { phoneToJid } from "@/lib/phone";
import { emitWebhookEvent } from "@/lib/webhooks";
import { createPostgresAuthState } from "@/lib/whatsapp/auth-store";
import { extractTextFromBaileysMessage, saveInboundMessage } from "@/lib/whatsapp/store";
import type { SendMessageInput, SendMessageResult, WhatsAppProvider } from "@/lib/whatsapp/types";

type SocketEntry = {
  socket: any;
  workspaceId: string;
};

export class BaileysProvider implements WhatsAppProvider {
  private sockets = new Map<string, SocketEntry>();
  private logger = pino({ level: env().BAILEYS_LOG_LEVEL });

  async connectDevice(deviceId: string) {
    const device = await prisma.whatsappDevice.findUnique({ where: { id: deviceId } });
    if (!device) throw new Error("Device not found.");

    await prisma.whatsappDevice.update({
      where: { id: deviceId },
      data: { status: "connecting", statusReason: null },
    });

    // Avoid broken optional native ws add-ons on some Windows/Node setups.
    process.env.WS_NO_BUFFER_UTIL = "1";
    process.env.WS_NO_UTF_8_VALIDATE = "1";

    const baileys = await import("@whiskeysockets/baileys");
    const { state, saveCreds } = await createPostgresAuthState(deviceId);

    const socket = baileys.default({
      auth: state as any,
      logger: this.logger,
      printQRInTerminal: false,
      browser: ["Baileys API Platform", "Chrome", "1.0.0"],
      syncFullHistory: false,
      markOnlineOnConnect: false,
    });

    this.sockets.set(deviceId, { socket, workspaceId: device.workspaceId });

    socket.ev.on("creds.update", saveCreds);

    socket.ev.on("connection.update", async (update: any) => {
      const connection = update.connection as string | undefined;
      const qr = update.qr as string | undefined;

      if (qr) {
        await prisma.whatsappDevice.update({
          where: { id: deviceId },
          data: {
            status: "qr_required",
            lastQr: qr,
            lastQrAt: new Date(),
            health: update,
          },
        });
      }

      if (connection === "open") {
        const user = socket.user as { id?: string; name?: string } | undefined;
        await prisma.whatsappDevice.update({
          where: { id: deviceId },
          data: {
            status: "connected",
            jid: user?.id,
            phoneNumber: user?.id?.split(":")[0]?.replace(/\D/g, ""),
            lastSeenAt: new Date(),
            connectedAt: new Date(),
            health: update,
          },
        });
        await emitWebhookEvent(device.workspaceId, "device_connected", {
          event: "device.connected",
          device_id: deviceId,
        });
      }

      if (connection === "close") {
        const statusCode = update.lastDisconnect?.error?.output?.statusCode;
        const loggedOut = statusCode === 401 || statusCode === 403;
        const nextStatus = loggedOut ? "logged_out" : "disconnected";

        this.sockets.delete(deviceId);
        await prisma.whatsappDevice.update({
          where: { id: deviceId },
          data: {
            status: nextStatus,
            statusReason: update.lastDisconnect?.error?.message ?? null,
            health: update,
          },
        });
        await emitWebhookEvent(device.workspaceId, "device_disconnected", {
          event: "device.disconnected",
          device_id: deviceId,
          reason: update.lastDisconnect?.error?.message,
        });

        if (!loggedOut) {
          setTimeout(() => {
            this.connectDevice(deviceId).catch((error) => this.logger.error(error));
          }, 5000);
        }
      }
    });

    socket.ev.on("messages.upsert", async (event: any) => {
      if (event.type !== "notify") return;

      for (const msg of event.messages ?? []) {
        if (!msg.message || msg.key?.fromMe) continue;

        await saveInboundMessage({
          workspaceId: device.workspaceId,
          deviceId,
          externalId: msg.key?.id,
          fromJid: msg.key?.remoteJid,
          pushName: msg.pushName,
          text: extractTextFromBaileysMessage(msg.message),
          payload: msg,
        });
      }
    });
  }

  async disconnectDevice(deviceId: string, logout = false) {
    const entry = this.sockets.get(deviceId);
    if (entry) {
      if (logout) await entry.socket.logout();
      else entry.socket.end(new Error("Disconnected from dashboard"));
    }

    this.sockets.delete(deviceId);
    await prisma.whatsappDevice.update({
      where: { id: deviceId },
      data: { status: logout ? "logged_out" : "disconnected" },
    });
  }

  async sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
    const device = await prisma.whatsappDevice.findUnique({ where: { id: input.deviceId } });
    if (!device) throw new Error("Device not found.");
    if (device.status !== "connected") throw new Error("Device is not connected.");
    if ((device.currentDailySentCount ?? 0) >= device.dailySendLimit) {
      throw new Error("Device daily send limit reached.");
    }

    let entry = this.sockets.get(input.deviceId);
    if (!entry) {
      await this.connectDevice(input.deviceId);
      entry = this.sockets.get(input.deviceId);
    }

    if (!entry) throw new Error("Device socket is not ready.");

    const jid = phoneToJid(input.to);
    const content = this.toBaileysContent(input);
    const result = await entry.socket.sendMessage(jid, content);

    await prisma.whatsappDevice.update({
      where: { id: input.deviceId },
      data: {
        currentDailySentCount: { increment: 1 },
        lastSeenAt: new Date(),
      },
    });

    return {
      externalId: result?.key?.id,
      status: "sent",
    };
  }

  private toBaileysContent(input: SendMessageInput) {
    const type = String(input.type);

    if (type === MessageType.text) {
      return { text: input.text ?? "" };
    }

    if (type === MessageType.image) {
      return { image: { url: input.media?.url }, caption: input.media?.caption };
    }

    if (type === MessageType.document) {
      return {
        document: { url: input.media?.url },
        fileName: input.media?.filename,
        mimetype: input.media?.mime_type,
        caption: input.media?.caption,
      };
    }

    if (type === MessageType.audio) {
      return { audio: { url: input.media?.url }, mimetype: input.media?.mime_type };
    }

    if (type === MessageType.video) {
      return { video: { url: input.media?.url }, caption: input.media?.caption };
    }

    if (type === MessageType.location) {
      return {
        location: {
          degreesLatitude: input.location?.latitude,
          degreesLongitude: input.location?.longitude,
          name: input.location?.name,
          address: input.location?.address,
        },
      };
    }

    if (type === MessageType.contact) {
      const phone = input.contact?.phone ?? "";
      return {
        contacts: {
          displayName: input.contact?.full_name ?? phone,
          contacts: [
            {
              displayName: input.contact?.full_name ?? phone,
              vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${input.contact?.full_name ?? phone}\nTEL;type=CELL;type=VOICE;waid=${phone}:${phone}\nEND:VCARD`,
            },
          ],
        },
      };
    }

    throw new Error("Unsupported or experimental message type.");
  }
}
