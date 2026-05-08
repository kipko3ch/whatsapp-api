export function normalizePhone(input: string) {
  return input.replace(/[^\d]/g, "");
}

export function phoneToJid(phone: string) {
  return `${normalizePhone(phone)}@s.whatsapp.net`;
}

export function jidToPhone(jid?: string | null) {
  if (!jid) return "";
  return jid.split("@")[0].replace(/[^\d]/g, "");
}
