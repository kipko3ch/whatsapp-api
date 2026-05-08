import type { WhatsAppProvider } from "@/lib/whatsapp/types";
import { BaileysProvider } from "@/lib/whatsapp/baileys-provider";

const globalForWhatsapp = globalThis as unknown as {
  whatsappProvider?: WhatsAppProvider;
};

export function whatsappProvider() {
  if (!globalForWhatsapp.whatsappProvider) {
    globalForWhatsapp.whatsappProvider = new BaileysProvider();
  }

  return globalForWhatsapp.whatsappProvider;
}
