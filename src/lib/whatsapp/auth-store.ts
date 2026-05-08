import { prisma } from "@/lib/db";

type BaileysModule = typeof import("@whiskeysockets/baileys");

function serialize(value: unknown, baileys: BaileysModule) {
  return JSON.parse(JSON.stringify(value, baileys.BufferJSON.replacer));
}

function deserialize<T>(value: unknown, baileys: BaileysModule): T {
  return JSON.parse(JSON.stringify(value), baileys.BufferJSON.reviver) as T;
}

export async function createPostgresAuthState(deviceId: string) {
  const baileys = await import("@whiskeysockets/baileys");
  const credsRow = await prisma.whatsappSession.findUnique({
    where: {
      deviceId_keyType_keyId: {
        deviceId,
        keyType: "creds",
        keyId: "creds",
      },
    },
  });

  const creds = credsRow
    ? deserialize(credsRow.value, baileys)
    : baileys.initAuthCreds();

  const saveCreds = async () => {
    await prisma.whatsappSession.upsert({
      where: {
        deviceId_keyType_keyId: {
          deviceId,
          keyType: "creds",
          keyId: "creds",
        },
      },
      create: {
        deviceId,
        keyType: "creds",
        keyId: "creds",
        value: serialize(creds, baileys),
      },
      update: {
        value: serialize(creds, baileys),
      },
    });
  };

  return {
    state: {
      creds,
      keys: {
        get: async (type: string, ids: string[]) => {
          const rows = await prisma.whatsappSession.findMany({
            where: {
              deviceId,
              keyType: type,
              keyId: { in: ids },
            },
          });

          return ids.reduce<Record<string, unknown>>((acc, id) => {
            const row = rows.find((item) => item.keyId === id);
            if (row) acc[id] = deserialize(row.value, baileys);
            return acc;
          }, {});
        },
        set: async (data: Record<string, Record<string, unknown | null>>) => {
          const operations = Object.entries(data).flatMap(([keyType, values]) =>
            Object.entries(values).map(([keyId, value]) => ({ keyType, keyId, value })),
          );

          await prisma.$transaction(
            operations.map((item) =>
              item.value
                ? prisma.whatsappSession.upsert({
                    where: {
                      deviceId_keyType_keyId: {
                        deviceId,
                        keyType: item.keyType,
                        keyId: item.keyId,
                      },
                    },
                    create: {
                      deviceId,
                      keyType: item.keyType,
                      keyId: item.keyId,
                      value: serialize(item.value, baileys),
                    },
                    update: {
                      value: serialize(item.value, baileys),
                    },
                  })
                : prisma.whatsappSession.deleteMany({
                    where: {
                      deviceId,
                      keyType: item.keyType,
                      keyId: item.keyId,
                    },
                  }),
            ),
          );
        },
      },
    },
    saveCreds,
  };
}
