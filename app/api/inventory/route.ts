import { readInventory } from "@/lib/inventory";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return Response.json(await readInventory(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      {
        error:
          "No se pudo cargar el inventario. Comprueba la conexión e inténtalo de nuevo.",
      },
      { status: 503 },
    );
  }
}
