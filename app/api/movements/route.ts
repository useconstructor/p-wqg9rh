import { readyDb } from "@/lib/db";
import { clean, validateMovement } from "@/lib/validation";
import { invalid } from "@/lib/write";
export async function POST(req: Request) {
  let tx;
  try {
    const b = await req.json();
    if (
      !["in", "out"].includes(b.type) ||
      typeof b.idempotency_key !== "string" ||
      !/^[a-zA-Z0-9-]{16,80}$/.test(b.idempotency_key)
    )
      return invalid({ quantity: "Solicitud de movimiento no válida." });
    const db = await readyDb();
    tx = await db.transaction("write");
    const prior = await tx.execute({
      sql: "SELECT * FROM movements WHERE idempotency_key=?",
      args: [b.idempotency_key],
    });
    if (prior.rows.length) {
      const m = prior.rows[0];
      if (
        m.product_id !== b.product_id ||
        m.type !== b.type ||
        Number(m.quantity) !== Number(b.quantity) ||
        m.reason !== clean(b.reason)
      ) {
        await tx.rollback();
        return Response.json(
          { error: "El identificador ya se usó para otra operación." },
          { status: 409 },
        );
      }
      await tx.commit();
      return Response.json({ ok: true, duplicate: true });
    }
    const { rows } = await tx.execute({
      sql: "SELECT stock FROM products WHERE id=?",
      args: [b.product_id],
    });
    if (!rows.length) {
      await tx.rollback();
      return Response.json(
        { error: "Producto no encontrado." },
        { status: 404 },
      );
    }
    const previous = Number(rows[0].stock);
    const fields = validateMovement(b, previous, b.type);
    if (Object.keys(fields).length) {
      await tx.rollback();
      return invalid(fields);
    }
    const q = Number(b.quantity);
    const next = previous + (b.type === "in" ? q : -q);
    const updated = await tx.execute({
      sql: "UPDATE products SET stock=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND stock=? AND stock+?>=0",
      args: [next, b.product_id, previous, b.type === "in" ? q : -q],
    });
    if (!updated.rowsAffected) {
      await tx.rollback();
      return Response.json(
        {
          error:
            "Las existencias han cambiado. Actualiza e inténtalo de nuevo.",
        },
        { status: 409 },
      );
    }
    await tx.execute({
      sql: "INSERT INTO movements (id,product_id,type,quantity,reason,previous_stock,resulting_stock,idempotency_key) VALUES (?,?,?,?,?,?,?,?)",
      args: [
        crypto.randomUUID(),
        b.product_id,
        b.type,
        q,
        clean(b.reason),
        previous,
        next,
        b.idempotency_key,
      ],
    });
    await tx.commit();
    return Response.json({ ok: true, stock: next }, { status: 201 });
  } catch {
    if (tx) await tx.rollback().catch(() => {});
    return Response.json(
      {
        error:
          "No se pudo registrar el movimiento. Puedes volver a intentarlo.",
      },
      { status: 503 },
    );
  } finally {
    tx?.close();
  }
}
