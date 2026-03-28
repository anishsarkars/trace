import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const databaseUrl = process.env.DATABASE_URL || "";
const isPg = databaseUrl.startsWith("postgres") || databaseUrl.startsWith("postgresql");

let prismaClient: PrismaClient;

if (isPg) {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool as any);
  prismaClient = new PrismaClient({ adapter, log: ["query"] });
} else {
  // SQLite or other direct providers
  prismaClient = new PrismaClient({ log: ["query"] });
}

export const prisma = globalForPrisma.prisma || prismaClient;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
