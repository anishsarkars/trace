import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const databaseUrl = process.env.DATABASE_URL || "";
// Default to PostgreSQL logic unless explicitly using a local SQLite file in dev
const isLocalSqlite = databaseUrl.startsWith("file:");

let prismaClient: PrismaClient;

if (!isLocalSqlite) {
  // Use the PostgreSQL Pool adapter for production (Vercel) and PG-based dev
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool as any);
  prismaClient = new PrismaClient({ adapter, log: ["query"] });
} else {
  // Use the default driver for local SQLite
  prismaClient = new PrismaClient({ log: ["query"] });
}

export const prisma = globalForPrisma.prisma || prismaClient;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
