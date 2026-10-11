import "server-only";
import { readyDb } from "./db";
import type { Inventory } from "./validation";
export async function readInventory(): Promise<Inventory> {
  const db = await readyDb();
  const results = await db.batch(
    [
      "SELECT p.*, c.name AS category FROM products p JOIN categories c ON p.category_id=c.id ORDER BY p.created_at DESC,p.id",
      "SELECT id,name FROM categories ORDER BY name COLLATE NOCASE",
      "SELECT m.*, p.name AS product_name FROM movements m JOIN products p ON m.product_id=p.id ORDER BY m.created_at DESC,m.id DESC",
    ],
    "read",
  );
  return {
    products: results[0].rows,
    categories: results[1].rows,
    movements: results[2].rows,
  } as unknown as Inventory;
}
