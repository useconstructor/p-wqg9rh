import { readyDb } from "@/lib/db";
import { clean, validateProduct } from "@/lib/validation";
import { category, invalid } from "@/lib/write";
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let tx;
  try {
    const { id } = await params;
    const b = await req.json();
    const fields = validateProduct(b, true);
    if (Object.keys(fields).length) return invalid(fields);
    const db = await readyDb();
    tx = await db.transaction("write");
    const cat = await category(tx, b.category);
    const result = await tx.execute({
      sql: "UPDATE products SET name=?,category_id=?,minimum=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?",
      args: [clean(b.name), cat, Number(b.minimum), id],
    });
    if (!result.rowsAffected) {
      await tx.rollback();
      return Response.json(
        { error: "El producto ya no está disponible." },
        { status: 404 },
      );
    }
    await tx.commit();
    return Response.json({ id });
  } catch {
    if (tx) await tx.rollback().catch(() => {});
    return Response.json(
      { error: "No se pudo guardar. Tus datos se han conservado." },
      { status: 503 },
    );
  } finally {
    tx?.close();
  }
}
