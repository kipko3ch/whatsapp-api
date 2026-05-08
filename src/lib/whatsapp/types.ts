import type { MessageType } from "@prisma/client";

export type SendMessageInput = {
  deviceId: string;
  to: string;
  type: MessageType | "text" | "image" | "document" | "audio" | "video" | "location" | "contact";
  text?: string;
  media?: {
    url: string;
    mime_type?: string;
    filename?: string;
    caption?: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  contact?: {
    full_name: string;
    phone: string;
  };
};

export type SendMessageResult = {
  externalId?: string;
  status: "sent" | "queued";
};

export interface WhatsAppProvider {
  connectDevice(deviceId: string, options?: { freshSession?: boolean }): Promise<void>;
  disconnectDevice(deviceId: string, logout?: boolean): Promise<void>;
  sendMessage(input: SendMessageInput): Promise<SendMessageResult>;
}
