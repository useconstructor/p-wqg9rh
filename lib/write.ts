import "server-only";
import type { Transaction } from "@libsql/client";
import { clean } from "./validation";
export async function category(tx: Transaction, name: string) {
  const normalized = clean(name).toLocaleLowerCase("es");
  await tx.execute({
    sql: "INSERT INTO categories (id,name,normalized_name) VALUES (?,?,?) ON CONFLICT(normalized_name) DO NOTHING",
    args: [crypto.randomUUID(), clean(name), normalized],
  });
  const { rows } = await tx.execute({
    sql: "SELECT id FROM categories WHERE normalized_name=?",
    args: [normalized],
  });
  return String(rows[0].id);
}
export const invalid = (fields: Record<string, string>) =>
  Response.json(
    { error: "Revisa los campos indicados.", fields },
    { status: 400 },
  );
