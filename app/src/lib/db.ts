import { PrismaClient } from "@prisma/client";

/**
 * Two clients, two database roles.
 *  - dbPublic : DATABASE_URL_PUBLIC — role `dc_public`, which cannot read schema `internal` (db/roles.sql).
 *               Used by every student-facing page and public API route.
 *  - dbAdmin  : DATABASE_URL — full access. Only imported by /admin routes and handlers that have
 *               already passed `requireStaff()`.
 */
const g = globalThis as unknown as { dbPublic?: PrismaClient; dbAdmin?: PrismaClient };

export const dbPublic =
  g.dbPublic ??
  new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL_PUBLIC ?? process.env.DATABASE_URL } },
    log: ["error"],
  });

export const dbAdmin =
  g.dbAdmin ?? new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } }, log: ["error"] });

if (process.env.NODE_ENV !== "production") {
  g.dbPublic = dbPublic;
  g.dbAdmin = dbAdmin;
}
