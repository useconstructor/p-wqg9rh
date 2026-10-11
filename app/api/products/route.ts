import { readyDb } from "@/lib/db";
import { clean, validateProduct } from "@/lib/validation";
import { category, invalid } from "@/lib/write";
export async function POST(req: Request) {
  let tx;
  try {
    const b = await req.json();
    const fields = validateProduct(b);
    if (Object.keys(fields).length) return invalid(fields);
    const db = await readyDb();
    tx = await db.transaction("write");
    const cat = await category(tx, b.category);
    const id = crypto.randomUUID();
    const stock = Number(b.stock);
    await tx.execute({
      sql: "INSERT INTO products (id,name,category_id,stock,minimum) VALUES (?,?,?,?,?)",
      args: [id, clean(b.name), cat, stock, Number(b.minimum)],
    });
    if (stock > 0)
      await tx.execute({
        sql: "INSERT INTO movements (id,product_id,type,quantity,reason,previous_stock,resulting_stock,idempotency_key) VALUES (?,?,?,?,?,?,?,?)",
        args: [
          crypto.randomUUID(),
          id,
          "in",
          stock,
          "Existencias iniciales",
          0,
          stock,
          `initial:${id}`,
        ],
      });
    await tx.commit();
    return Response.json({ id }, { status: 201 });
  } catch {
    if (tx) await tx.rollback().catch(() => {});
    return Response.json(
      { error: "No se pudo guardar el producto. Tus datos se han conservado." },
      { status: 503 },
    );
  } finally {
    tx?.close();
  }
}
