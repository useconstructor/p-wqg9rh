import "server-only";
import { createClient, type Client } from "@libsql/client";
import { readFile } from "node:fs/promises";
import path from "node:path";
let client: Client | undefined;
let migration: Promise<void> | undefined;
export function getDb() {
  if (!process.env.TURSO_DATABASE_URL)
    throw new Error("No se ha configurado la conexión con Turso.");
  return (client ??= createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  }));
}
export async function readyDb() {
  const db = getDb();
  if (!migration)
    migration = readFile(
      path.join(process.cwd(), "migrations/001_inventory.sql"),
      "utf8",
    )
      .then(async (sql) => {
        await db.executeMultiple(sql);
      })
      .catch((e) => {
        migration = undefined;
        throw e;
      });
  await migration;
  return db;
}
