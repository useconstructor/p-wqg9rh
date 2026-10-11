export type Product = {
  id: string;
  name: string;
  category_id: string;
  category: string;
  stock: number;
  minimum: number;
  created_at: string;
  updated_at: string;
};
export type Movement = {
  id: string;
  product_id: string;
  product_name: string;
  type: "in" | "out";
  quantity: number;
  reason: string;
  previous_stock: number;
  resulting_stock: number;
  created_at: string;
};
export type Inventory = {
  products: Product[];
  categories: { id: string; name: string }[];
  movements: Movement[];
};
export type Fields = Record<string, string>;
export const clean = (s: unknown) =>
  typeof s === "string" ? s.trim().replace(/\s+/g, " ") : "";
export function validateProduct(d: Fields, editing = false) {
  const e: Fields = {};
  if (!clean(d.name)) e.name = "Introduce el nombre del producto.";
  else if (clean(d.name).length > 120) e.name = "Máximo 120 caracteres.";
  if (!clean(d.category)) e.category = "Introduce o selecciona una categoría.";
  else if (clean(d.category).length > 80) e.category = "Máximo 80 caracteres.";
  for (const k of editing ? ["minimum"] : ["stock", "minimum"])
    if (
      !/^\d+$/.test(String(d[k])) ||
      !Number.isSafeInteger(Number(d[k])) ||
      Number(d[k]) > 2147483647
    )
      e[k] = "Introduce un número entero igual o mayor que cero.";
  return e;
}
export function validateMovement(d: Fields, stock: number, type: string) {
  const e: Fields = {};
  if (
    !/^\d+$/.test(String(d.quantity)) ||
    !Number.isSafeInteger(Number(d.quantity)) ||
    Number(d.quantity) < 1 ||
    Number(d.quantity) > 2147483647
  )
    e.quantity = "Introduce una cantidad entera mayor que cero.";
  else if (type === "out" && Number(d.quantity) > stock)
    e.quantity = "La cantidad supera las existencias disponibles.";
  else if (type === "in" && Number(d.quantity) + stock > 2147483647)
    e.quantity = "La cantidad supera el límite permitido.";
  if (!clean(d.reason)) e.reason = "Indica el motivo del movimiento.";
  else if (clean(d.reason).length > 500) e.reason = "Máximo 500 caracteres.";
  return e;
}
