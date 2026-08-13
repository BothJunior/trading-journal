import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";
import path from "path";

let dbUrl = process.env.TURSO_DATABASE_URL || "file:./prisma/dev.db";

if (dbUrl.startsWith("file:")) {
  const relativePath = dbUrl.replace(/^file:/, "");
  const absolutePath = path.resolve(process.cwd(), relativePath);
  dbUrl = `file:${absolutePath}`;
}

const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

const libsql = createClient({
  url: dbUrl,
  authToken,
});

const adapter = new PrismaLibSQL(libsql);

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
