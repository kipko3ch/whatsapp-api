import type { WhatsappDevice } from "@prisma/client";
import { prisma } from "@/lib/db";

export type DeviceResolution =
  | {
      ok: true;
      device: WhatsappDevice;
      matchedBy: "id" | "name" | "phoneNumber" | "jid";
    }
  | {
      ok: false;
      reason: "not_found" | "ambiguous";
      matches?: Pick<WhatsappDevice, "id" | "name" | "phoneNumber" | "jid" | "status">[];
    };

export async function resolveWhatsappDevice(workspaceId: string, identifier: string): Promise<DeviceResolution> {
  const deviceId = identifier.trim();

  const byId = await prisma.whatsappDevice.findFirst({
    where: { id: deviceId, workspaceId },
  });
  if (byId) return { ok: true, device: byId, matchedBy: "id" };

  const normalizedPhone = deviceId.replace(/\D/g, "");
  const candidates = await prisma.whatsappDevice.findMany({
    where: {
      workspaceId,
      OR: [
        { name: deviceId },
        ...(normalizedPhone ? [{ phoneNumber: normalizedPhone }] : []),
        { jid: deviceId },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 2,
  });

  if (candidates.length === 1) {
    const [device] = candidates;
    const matchedBy =
      device.name === deviceId ? "name" : normalizedPhone && device.phoneNumber === normalizedPhone ? "phoneNumber" : "jid";

    return { ok: true, device, matchedBy };
  }

  if (candidates.length > 1) {
    return {
      ok: false,
      reason: "ambiguous",
      matches: candidates.map(({ id, name, phoneNumber, jid, status }) => ({ id, name, phoneNumber, jid, status })),
    };
  }

  return { ok: false, reason: "not_found" };
}

export function exposeApiDeviceId<T extends WhatsappDevice>(device: T) {
  return {
    ...device,
    device_id: device.id,
  };
}
