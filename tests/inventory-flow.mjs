import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
// Destructive assertions are restricted to an explicitly supplied, isolated QA server.
const baseURL = process.env.QA_BASE_URL;
if (!baseURL)
  throw Error(
    "Set QA_BASE_URL to a server using an empty, disposable database. Never run against production.",
  );
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    baseURL: baseURL,
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(baseURL);
  await page
    .getByRole("heading", { name: "Un buen inventario empieza aquí" })
    .waitFor();
  await page.screenshot({
    path: "/tmp/inventario-desktop-empty.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Crear primer producto" }).click();
  await page.getByLabel("Nombre del producto").fill("QA · Arandela M8");
  await page
    .getByLabel("Categoría", { exact: true })
    .fill("  Ferretería   general  ");
  await page.getByLabel("Existencias iniciales").fill("10");
  await page.getByLabel("Stock mínimo").fill("3");
  await page
    .getByRole("button", { name: "Crear producto", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Producto creado correctamente" })
    .waitFor();
  await page.reload();
  await page
    .getByRole("button", { name: "QA · Arandela M8", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Editar producto", exact: true })
    .click();
  await page
    .getByLabel("Nombre del producto")
    .fill("QA · Arandela M8 revisada");
  await page.getByLabel("Stock mínimo").fill("4");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Producto actualizado" })
    .waitFor();
  await page.reload();
  await page.getByRole("button", { name: "Entrada", exact: true }).click();
  await page.getByLabel("Cantidad", { exact: true }).fill("5");
  await page.getByLabel("Motivo").fill("Verificación de entrada");
  await page.getByRole("button", { name: "Revisar movimiento" }).click();
  await page
    .getByRole("button", { name: "Confirmar entrada de 5 unidades" })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Entrada registrada" })
    .waitFor();
  await page.reload();
  await page.getByRole("button", { name: "Salida", exact: true }).click();
  await page.getByLabel("Cantidad", { exact: true }).fill("99");
  await page.getByLabel("Motivo").fill("Verificación de salida");
  await page.getByRole("button", { name: "Revisar movimiento" }).click();
  await page
    .getByText("La cantidad supera las existencias disponibles.")
    .waitFor();
  await page.getByLabel("Cantidad", { exact: true }).fill("3");
  await page.getByRole("button", { name: "Revisar movimiento" }).click();
  await page
    .getByRole("button", { name: "Confirmar salida de 3 unidades" })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Salida registrada" })
    .waitFor();
  await page.reload();
  let inventory = await (await page.request.get("/api/inventory")).json();
  assert.equal(inventory.products[0].stock, 12);
  assert.equal(inventory.products[0].name, "QA · Arandela M8 revisada");
  assert.equal(inventory.movements.length, 3);
  assert.equal(inventory.categories[0].name, "Ferretería general");
  await page.getByRole("link", { name: "Ver historial completo" }).click();
  await page.reload();
  await page
    .getByText("Verificación de salida", { exact: true })
    .first()
    .waitFor();
  const id = inventory.products[0].id,
    key = crypto.randomUUID();
  const body = {
    product_id: id,
    type: "out",
    quantity: "2",
    reason: "QA idempotencia",
    idempotency_key: key,
  };
  let r = await page.request.post("/api/movements", { data: body });
  assert.equal(r.status(), 201);
  r = await page.request.post("/api/movements", { data: body });
  assert.equal(r.status(), 200);
  assert.equal((await r.json()).duplicate, true);
  for (const q of ["0", "-1", "1.5", "abc"]) {
    r = await page.request.post("/api/movements", {
      data: { ...body, quantity: q, idempotency_key: crypto.randomUUID() },
    });
    assert.equal(r.status(), 400);
  }
  const outcomes = await Promise.all(
    [1, 2].map(() =>
      page.request.post("/api/movements", {
        data: {
          ...body,
          quantity: "8",
          idempotency_key: crypto.randomUUID(),
          reason: "QA concurrencia",
        },
      }),
    ),
  );
  assert.equal(outcomes.filter((r) => r.status() === 201).length, 1);
  inventory = await (await page.request.get("/api/inventory")).json();
  assert.equal(inventory.products[0].stock, 2);
  assert.equal(inventory.movements.length, 5);
  r = await page.request.post("/api/products", {
    data: {
      name: "QA · Producto cero",
      category: "FERRETERÍA GENERAL",
      stock: "0",
      minimum: "0",
    },
  });
  assert.equal(r.status(), 201);
  inventory = await (await page.request.get("/api/inventory")).json();
  assert.equal(inventory.categories.length, 1);
  assert.equal(inventory.movements.length, 5);
  await page.goto(baseURL + "/");
  await page.getByLabel("Buscar productos por nombre").fill("Arandela");
  await page
    .getByLabel("Filtrar por categoría")
    .selectOption(inventory.categories[0].id);
  await page.getByRole("button", { name: "Stock bajo", exact: true }).click();
  await page.waitForTimeout(500);
  await page.reload();
  assert.equal(
    await page.getByLabel("Buscar productos por nombre").inputValue(),
    "Arandela",
  );
  await page
    .getByRole("button", { name: "QA · Arandela M8 revisada", exact: true })
    .first()
    .waitFor();
  await page.screenshot({
    path: "/tmp/inventario-desktop-products.png",
    fullPage: true,
  });
  for (const [name, width, height] of [
    ["tablet", 820, 1100],
    ["mobile", 390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(baseURL + "/");
    await page.screenshot({
      path: `/tmp/inventario-${name}.png`,
      fullPage: true,
    });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `${name} overflow`,
    );
    await page.getByRole("button", { name: "Nuevo producto" }).click();
    await page.getByLabel("Nombre del producto").fill("QA sin guardar");
    await page.keyboard.press("Escape");
    await page
      .getByRole("heading", { name: "¿Descartar los cambios?" })
      .waitFor();
    await page.getByRole("button", { name: "Descartar cambios" }).click();
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page.evaluate(
      () =>
        getComputedStyle(document.querySelector("button")).transitionDuration,
    ),
    "0s",
  );
  await page.route("**/api/products", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "QA fallo del servidor" }),
    }),
  );
  await page.getByRole("button", { name: "Nuevo producto" }).click();
  await page.getByLabel("Nombre del producto").fill("QA conservar datos");
  await page.getByLabel("Categoría", { exact: true }).fill("QA");
  await page
    .getByRole("button", { name: "Crear producto", exact: true })
    .click();
  await page.getByRole("alert").filter({ hasText: "QA fallo" }).waitFor();
  assert.equal(
    await page.getByLabel("Nombre del producto").inputValue(),
    "QA conservar datos",
  );
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(
    "PASS: create/edit/in/out, reload, history, normalization, zero stock, overdraw, invalid values, idempotency, concurrency, URL filters, responsive, discard, reduced motion, server failure; no browser exceptions",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
