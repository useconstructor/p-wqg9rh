"use client";
import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Boxes,
  Package,
  LayoutDashboard,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  History,
  X,
  SlidersHorizontal,
  TriangleAlert,
  Check,
  CheckCircle2,
  Menu,
  PackageOpen,
  Pencil,
  Loader2,
  RefreshCw,
  Info,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type Inventory,
  type Product,
  type Fields,
  validateProduct,
  validateMovement,
} from "@/lib/validation";
const empty: Inventory = { products: [], categories: [], movements: [] };
const number = (n: number) => n.toLocaleString("es-ES");
const date = (s: string) =>
  new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(s));
type Modal = { kind: "create" | "edit" | "in" | "out"; product?: Product };
function Status({ p }: { p: Product }) {
  const zero = p.stock === 0,
    low = p.stock <= p.minimum;
  const Icon = zero ? PackageOpen : low ? TriangleAlert : CheckCircle2;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${zero ? "bg-slate-100 text-slate-600" : low ? "bg-amber-50 text-warning" : "bg-emerald-50 text-success"}`}
    >
      <Icon size={13} />
      {zero ? "Sin existencias" : low ? "Stock bajo" : "Disponible"}
    </span>
  );
}
export default function Workspace(props: {
  initial: Inventory | null;
  selectedId?: string;
  view?: "movements";
}) {
  return (
    <Suspense
      fallback={
        <div className="p-8" role="status">
          Cargando inventario…
        </div>
      }
    >
      <InventoryWorkspace {...props} />
    </Suspense>
  );
}
function InventoryWorkspace({
  initial,
  selectedId,
  view,
}: {
  initial: Inventory | null;
  selectedId?: string;
  view?: "movements";
}) {
  const router = useRouter(),
    params = useSearchParams();
  const [data, setData] = useState(initial ?? empty),
    [readError, setReadError] = useState(!initial),
    [loading, setLoading] = useState(false),
    [notice, setNotice] = useState(""),
    [modal, setModal] = useState<Modal | null>(null),
    [menu, setMenu] = useState(false),
    [page, setPage] = useState(1);
  const [query, setQuery] = useState(params.get("q") ?? "");
  const category = params.get("category") ?? "",
    low = params.get("low") === "1",
    sort = params.get("sort") ?? "recent",
    productFilter = params.get("product") ?? "",
    typeFilter = params.get("type") ?? "";
  const history = view === "movements",
    selected = data.products.find((p) => p.id === selectedId);
  const filter = useCallback(
    (key: string, value: string) => {
      const p = new URLSearchParams(window.location.search);
      if (value) p.set(key, value);
      else p.delete(key);
      setPage(1);
      window.history.replaceState(
        null,
        "",
        `${history ? "/movements" : selectedId ? `/products/${selectedId}` : "/"}${p.size ? "?" + p : ""}`,
      );
    },
    [history, selectedId],
  );
  useEffect(() => {
    const t = setTimeout(() => {
      if (
        query !== (new URLSearchParams(window.location.search).get("q") ?? "")
      )
        filter("q", query);
    }, 250);
    return () => clearTimeout(t);
  }, [query, filter]); // URL is updated after rapid typing settles.
  useEffect(() => {
    const sync = () =>
      setQuery(new URLSearchParams(window.location.search).get("q") ?? "");
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/inventory", { cache: "no-store" });
      if (!r.ok) throw Error();
      setData(await r.json());
      setReadError(false);
    } catch {
      setReadError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!initial) {
      const t = setTimeout(() => void refresh(), 0);
      return () => clearTimeout(t);
    }
  }, [initial, refresh]);
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(""), 6000);
      return () => clearTimeout(t);
    }
  }, [notice]);
  const filtered = useMemo(
    () =>
      data.products
        .filter(
          (p) =>
            p.name
              .toLocaleLowerCase("es")
              .includes(query.toLocaleLowerCase("es")) &&
            (!category || p.category_id === category) &&
            (!low || p.stock <= p.minimum),
        )
        .sort((a, b) =>
          sort === "name"
            ? a.name.localeCompare(b.name, "es")
            : sort === "stock"
              ? a.stock - b.stock
              : b.created_at.localeCompare(a.created_at),
        ),
    [data.products, query, category, low, sort],
  );
  const movements = data.movements.filter(
    (m) =>
      (!productFilter || m.product_id === productFilter) &&
      (!typeFilter || m.type === typeFilter),
  );
  const list = history ? movements : filtered,
    totalPages = Math.max(1, Math.ceil(list.length / 8)),
    currentPage = Math.min(page, totalPages);
  const shown = filtered.slice((currentPage - 1) * 8, currentPage * 8),
    shownMoves = movements.slice((currentPage - 1) * 8, currentPage * 8);
  function clearFilters() {
    setQuery("");
    setPage(1);
    router.replace(
      history ? "/movements" : selectedId ? `/products/${selectedId}` : "/",
      { scroll: false },
    );
  }
  function detail(p: Product) {
    router.push(`/products/${p.id}${params.size ? "?" + params : ""}`, {
      scroll: false,
    });
  }
  const hasFilters = !!(query || category || low),
    lowCount = data.products.filter((p) => p.stock <= p.minimum).length;
  const nav = [
    {
      href: "/",
      label: "Resumen",
      icon: LayoutDashboard,
      active: !history && !selectedId && !category && !low && !params.has("q"),
    },
    {
      href: "/?view=products",
      label: "Productos",
      icon: Package,
      active:
        !history &&
        (!!selectedId ||
          params.has("view") ||
          !!category ||
          low ||
          params.has("q")),
    },
    {
      href: "/movements",
      label: "Movimientos",
      icon: History,
      active: history,
    },
  ];
  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-white focus:p-3"
      >
        Ir al contenido
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col border-r bg-white lg:flex">
        <Link href="/" className="flex h-[88px] items-center gap-3 px-6">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-white">
            <Boxes size={24} strokeWidth={1.7} />
          </div>
          <div className="leading-5">
            <span className="block text-[17px] font-semibold tracking-tight">
              Inventario<span className="text-primary">.</span>
            </span>
            <span className="text-[13px] text-muted-foreground">Taller</span>
          </div>
        </Link>
        <div className="px-4 pt-6">
          <p className="eyebrow mb-3 px-3">Espacio de trabajo</p>
          <nav className="space-y-1">
            {nav.map((n) => (
              <Link
                key={n.label}
                href={n.href}
                className={`flex h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150 ${n.active ? "bg-accent text-primary" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}
              >
                <n.icon size={19} />
                {n.label}
                {n.active && (
                  <span className="ml-auto size-1.5 rounded-full bg-primary" />
                )}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mx-6 mt-7 border-t pt-6">
          <p className="eyebrow mb-4">Tu inventario</p>
          <div className="flex justify-between text-[13px] text-muted-foreground">
            <span>Categorías</span>
            <span className="font-mono text-foreground">
              {data.categories.length}
            </span>
          </div>
        </div>
        <div className="mt-auto p-4">
          <div className="rounded-lg border bg-background/70 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium">
              <ShieldCheck
                size={16}
                className={readError ? "text-warning" : "text-success"}
              />
              {readError ? "Conexión pendiente" : "Datos guardados"}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {readError
                ? "Comprueba la conexión para acceder a tu inventario."
                : "Cada movimiento cuenta. Tu inventario se conserva al recargar."}
            </p>
          </div>
          <div className="mt-5 flex items-center gap-3 px-2 pb-2">
            <div className="flex size-8 items-center justify-center rounded-md border text-sm font-medium">
              IT
            </div>
            <div>
              <p className="text-xs font-medium">Mi taller</p>
              <p className="text-xs text-muted-foreground">
                Control de inventario
              </p>
            </div>
          </div>
        </div>
      </aside>
      <div className="lg:ml-[232px]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-white/95 px-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-2 text-sm">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label={menu ? "Cerrar navegación" : "Abrir navegación"}
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X size={20} /> : <Menu size={20} />}
            </Button>
            <span className="hidden text-muted-foreground sm:block">
              Mi taller
            </span>
            <ChevronRight
              size={14}
              className="hidden text-muted-foreground sm:block"
            />
            <div className="leading-tight">
              <span className="block text-base font-semibold lg:hidden">
                Inventario Taller
              </span>
              <span className={history ? "block text-xs font-medium lg:text-sm" : "hidden font-medium lg:block"}>
                {history ? "Movimientos" : "Inventario"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs sm:flex ${readError ? "text-warning" : "text-muted-foreground"}`}
            >
              <span
                className={`size-1.5 rounded-full ${readError ? "bg-warning" : "bg-success"}`}
              />
              {readError
                ? "Sin conexión"
                : loading
                  ? "Sincronizando"
                  : "Inventario actualizado"}
            </span>
            <button
              className="icon-button"
              onClick={refresh}
              aria-label="Actualizar inventario"
              disabled={loading}
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            </button>
            <div className="flex size-8 items-center justify-center rounded-full bg-accent text-xs font-medium text-primary">
              IT
            </div>
          </div>
        </header>
        <nav
          aria-label="Navegación móvil"
          inert={!menu}
          className={`fixed inset-x-0 top-16 z-30 border-b bg-white p-4 shadow-sm transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] lg:hidden ${menu ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-4 opacity-0"}`}
        >
          {nav.map((n, i) => (
            <Link
              key={n.label}
              href={n.href}
              onClick={() => setMenu(false)}
              style={{ transitionDelay: menu ? `${i * 60}ms` : "0ms" }}
              className={`flex h-12 items-center gap-3 rounded-lg px-3 transition-all ${n.active ? "bg-accent text-primary" : ""}`}
            >
              <n.icon size={18} />
              {n.label}
            </Link>
          ))}
        </nav>
        <main
          id="main"
          className="mx-auto max-w-[1540px] px-4 py-5 sm:px-8 sm:py-9 xl:px-10"
        >
          <div
            className={`mb-5 flex flex-wrap items-center justify-between gap-3 sm:mb-7 sm:gap-4 ${selectedId ? "hidden md:flex" : ""}`}
          >
            <div>
              <div className="eyebrow mb-2 flex items-center gap-2">
                <span className="h-px w-5 bg-primary" />
                Control de almacén
              </div>
              <h1 className="text-[28px] font-semibold leading-tight tracking-[-.035em] sm:text-[34px]">
                {history ? "Movimientos" : "Tu inventario, en orden."}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {history
                  ? "La trazabilidad de cada entrada y salida de tu taller."
                  : "Una vista clara de lo que tienes y lo que necesitas."}
              </p>
            </div>
            <Button
              className="h-11 rounded-lg px-5 shadow-sm"
              onClick={() => setModal({ kind: "create" })}
            >
              <Plus size={18} />
              Nuevo producto
            </Button>
          </div>
          <div
            role="status"
            aria-live="polite"
            className={
              notice
                ? "reveal mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-success"
                : "sr-only"
            }
          >
            {notice && <CheckCircle2 size={17} />} {notice}
          </div>
          {readError && (
            <div
              role="alert"
              className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm"
            >
              <TriangleAlert size={19} className="text-warning" />
              <span className="flex-1">
                No se pudo cargar el inventario. Comprueba la conexión con la
                base de datos.
              </span>
              <Button
                variant="outline"
                className="h-11 bg-white"
                onClick={refresh}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RefreshCw size={16} />
                )}
                Reintentar
              </Button>
            </div>
          )}
          {!history && (
            <section
              aria-label="Resumen del inventario"
              className={`mb-5 grid grid-cols-1 gap-2 sm:mb-7 sm:grid-cols-3 sm:gap-4 ${selectedId ? "hidden md:grid" : ""}`}
            >
              {[
                {
                  label: "Productos registrados",
                  value: data.products.length,
                  icon: Package,
                  caption: "Referencias en tu inventario",
                  color: "text-primary",
                  bg: "bg-accent",
                },
                {
                  label: "Unidades disponibles",
                  value: data.products.reduce((s, p) => s + p.stock, 0),
                  icon: Boxes,
                  caption: "Existencias totales del taller",
                  color: "text-muted-foreground",
                  bg: "bg-background",
                },
                {
                  label: "Productos con stock bajo",
                  value: lowCount,
                  icon: TriangleAlert,
                  caption: lowCount
                    ? "Revisa las existencias mínimas"
                    : "Todo listo para empezar",
                  color: "text-warning",
                  bg: "bg-amber-50",
                },
              ].map((s, i) => (
                <div
                  key={s.label}
                  className="panel relative flex items-center gap-4 px-4 py-2.5 sm:flex-col sm:items-stretch sm:gap-0 sm:p-6"
                >
                  <div className="flex flex-1 items-center justify-between gap-2 sm:min-h-10 sm:flex-none">
                    <span className="text-[13px] leading-5 text-muted-foreground">
                      {s.label}
                    </span>
                    <div
                      className={`hidden size-9 shrink-0 items-center justify-center rounded-lg sm:flex ${s.bg} ${s.color}`}
                    >
                      <s.icon size={19} strokeWidth={1.6} />
                    </div>
                  </div>
                  <p className="font-mono text-2xl font-medium leading-tight tracking-tight sm:mt-3 sm:text-[32px]">
                    {loading ? "…" : number(s.value)}
                  </p>
                  <div className="mt-3 hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                    {i === 2 && (
                      <span
                        className={`size-1.5 rounded-full ${lowCount ? "bg-warning" : "bg-success"}`}
                      />
                    )}{" "}
                    {s.caption}
                  </div>
                </div>
              ))}
            </section>
          )}
          <div
            className={`grid items-start gap-5 ${selectedId ? "xl:grid-cols-[minmax(0,1fr)_340px]" : ""}`}
          >
            <section
              className={`panel min-w-0 overflow-hidden ${selectedId ? "hidden md:block" : ""}`}
              aria-label={history ? "Historial" : "Productos"}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6 sm:py-5">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-semibold">
                    {history ? "Historial de movimientos" : "Productos"}
                  </h2>
                  <span className="rounded-md bg-background px-2 py-1 font-mono text-xs text-muted-foreground">
                    {history ? data.movements.length : data.products.length}
                  </span>
                </div>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-primary" />
                  {history ? "Registro permanente" : "Vista general"}
                </span>
              </div>
              {history ? (
                <div className="flex flex-wrap gap-3 border-b p-4 sm:px-6">
                  <label className="sr-only" htmlFor="product-filter">
                    Filtrar por producto
                  </label>
                  <select
                    id="product-filter"
                    className="control flex-1"
                    value={productFilter}
                    onChange={(e) => filter("product", e.target.value)}
                  >
                    <option value="">Todos los productos</option>
                    {data.products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <label className="sr-only" htmlFor="type-filter">
                    Tipo de movimiento
                  </label>
                  <select
                    id="type-filter"
                    className="control flex-1"
                    value={typeFilter}
                    onChange={(e) => filter("type", e.target.value)}
                  >
                    <option value="">Todas las operaciones</option>
                    <option value="in">Entradas</option>
                    <option value="out">Salidas</option>
                  </select>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3 border-b p-4 sm:px-6">
                  <div className="relative min-w-[180px] flex-1">
                    <Search
                      size={17}
                      className="absolute left-3 top-3.5 text-muted-foreground"
                    />
                    <label htmlFor="search" className="sr-only">
                      Buscar productos por nombre
                    </label>
                    <Input
                      id="search"
                      placeholder="Buscar un producto…"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setPage(1);
                      }}
                      className="h-11 rounded-lg bg-white pl-10"
                    />
                  </div>
                  <div className="relative min-w-[155px] flex-1 sm:max-w-[210px]">
                    <label htmlFor="category" className="sr-only">
                      Filtrar por categoría
                    </label>
                    <select
                      id="category"
                      value={category}
                      onChange={(e) => filter("category", e.target.value)}
                      className="control w-full appearance-none pr-8"
                    >
                      <option value="">Todas las categorías</option>
                      {data.categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="pointer-events-none absolute right-3 top-4 text-muted-foreground"
                    />
                  </div>
                  <button
                    aria-pressed={low}
                    onClick={() => filter("low", low ? "" : "1")}
                    className={`control flex items-center gap-2 ${low ? "border-primary bg-accent text-primary" : "text-muted-foreground"}`}
                  >
                    <SlidersHorizontal size={16} />
                    Stock bajo{low && <Check size={14} />}
                  </button>
                </div>
              )}
              {loading ? (
                <div
                  className="min-h-[350px] space-y-5 p-6"
                  role="status"
                  aria-label="Cargando inventario"
                >
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      className="h-12 animate-pulse rounded bg-background"
                      key={i}
                    />
                  ))}
                </div>
              ) : history ? (
                movements.length ? (
                  <>
                    <div className="hidden overflow-hidden md:block">
                      <table className="w-full text-left text-sm">
                        <thead className="h-11 bg-background/70 text-xs text-muted-foreground">
                          <tr>
                            <th className="px-6 font-medium">
                              Producto / motivo
                            </th>
                            <th className="px-3 font-medium">Movimiento</th>
                            <th className="px-3 font-medium">Existencias</th>
                            <th className="px-5 font-medium">Fecha</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shownMoves.map((m) => (
                            <tr key={m.id} className="border-t">
                              <td className="max-w-[250px] px-6 py-4">
                                <Link
                                  className="font-medium hover:text-primary"
                                  href={`/products/${m.product_id}`}
                                >
                                  {m.product_name}
                                </Link>
                                <p className="mt-1 break-words text-xs text-muted-foreground">
                                  {m.reason}
                                </p>
                              </td>
                              <td className="px-3">
                                <span
                                  className={`flex items-center gap-1 font-mono text-xs ${m.type === "in" ? "text-success" : "text-primary"}`}
                                >
                                  {m.type === "in" ? (
                                    <ArrowDownLeft size={15} />
                                  ) : (
                                    <ArrowUpRight size={15} />
                                  )}{" "}
                                  {m.type === "in" ? "+" : "−"}
                                  {m.quantity}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {m.type === "in" ? "Entrada" : "Salida"}
                                </span>
                              </td>
                              <td className="px-3 font-mono text-xs">
                                {m.previous_stock} → {m.resulting_stock}
                              </td>
                              <td className="px-5 text-xs text-muted-foreground">
                                {date(m.created_at)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="divide-y md:hidden">
                      {shownMoves.map((m) => (
                        <div key={m.id} className="p-5">
                          <div className="flex justify-between gap-3">
                            <Link
                              href={`/products/${m.product_id}`}
                              className="font-medium"
                            >
                              {m.product_name}
                            </Link>
                            <span
                              className={`font-mono text-sm ${m.type === "in" ? "text-success" : "text-primary"}`}
                            >
                              {m.type === "in" ? "+" : "−"}
                              {m.quantity}
                            </span>
                          </div>
                          <p className="my-2 break-words text-sm text-muted-foreground">
                            {m.reason}
                          </p>
                          <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                            <span>
                              {m.type === "in" ? "Entrada" : "Salida"} ·{" "}
                              {m.previous_stock} → {m.resulting_stock}
                            </span>
                            <span>{date(m.created_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <Empty
                    icon="history"
                    title={
                      productFilter || typeFilter
                        ? "Sin movimientos para estos filtros"
                        : "Cada movimiento tiene su historia"
                    }
                    description={
                      productFilter || typeFilter
                        ? "Prueba con otro producto o tipo de operación."
                        : "Las entradas y salidas aparecerán aquí cuando registres tu primer movimiento."
                    }
                    action={
                      productFilter || typeFilter ? (
                        <Button variant="outline" onClick={clearFilters}>
                          Limpiar filtros
                        </Button>
                      ) : (
                        <Button variant="outline" asChild>
                          <Link href="/">
                            Ver productos
                            <ArrowRight size={16} />
                          </Link>
                        </Button>
                      )
                    }
                  />
                )
              ) : filtered.length ? (
                <>
                  <div className="hidden md:block">
                    <table className="w-full table-fixed text-left text-sm">
                      <thead className="h-11 bg-background/70 text-xs text-muted-foreground">
                        <tr>
                          <th className="w-[28%] pl-6 font-medium">
                            <button
                              className="flex h-11 items-center gap-2 text-sm"
                              onClick={() =>
                                filter(
                                  "sort",
                                  sort === "name" ? "recent" : "name",
                                )
                              }
                            >
                              Producto
                              <ChevronsUpDown size={12} />
                            </button>
                          </th>
                          <th className="w-[17%] px-2 font-medium">
                            Categoría
                          </th>
                          <th className="w-[13%] px-2 font-medium">
                            <button
                              className="flex h-11 items-center gap-1 text-sm"
                              onClick={() =>
                                filter(
                                  "sort",
                                  sort === "stock" ? "recent" : "stock",
                                )
                              }
                            >
                              Stock
                              <ChevronsUpDown size={12} />
                            </button>
                          </th>
                          <th className="w-[10%] px-2 font-medium">Mínimo</th>
                          <th className="w-[18%] px-2 font-medium">Estado</th>
                          <th className="w-[14%] pr-5 text-right font-medium">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {shown.map((p) => (
                          <tr
                            key={p.id}
                            className={`border-t transition-colors hover:bg-background/50 ${p.id === selectedId ? "bg-accent/40" : ""}`}
                          >
                            <td className="py-5 pl-6 pr-2">
                              <button
                                className="block w-full truncate text-left font-medium hover:text-primary"
                                onClick={() => detail(p)}
                              >
                                {p.name}
                              </button>
                              <p className="mt-1 font-mono text-xs text-muted-foreground">
                                #{p.id.slice(0, 8).toUpperCase()}
                              </p>
                            </td>
                            <td className="truncate px-2 text-xs text-muted-foreground">
                              {p.category}
                            </td>
                            <td className="px-2 font-mono text-base font-medium">
                              {number(p.stock)}
                            </td>
                            <td className="px-2 font-mono text-xs text-muted-foreground">
                              {p.minimum}
                            </td>
                            <td className="px-2">
                              <Status p={p} />
                            </td>
                            <td className="pr-3">
                              <div className="flex justify-end">
                                <button
                                  className="icon-button text-success"
                                  aria-label={`Registrar entrada de ${p.name}`}
                                  onClick={() =>
                                    setModal({ kind: "in", product: p })
                                  }
                                >
                                  <ArrowDownLeft size={18} />
                                </button>
                                <button
                                  className="icon-button text-primary"
                                  aria-label={`Registrar salida de ${p.name}`}
                                  onClick={() =>
                                    setModal({ kind: "out", product: p })
                                  }
                                >
                                  <ArrowUpRight size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="divide-y md:hidden">
                    {shown.map((p) => (
                      <article key={p.id} className="p-5">
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <button
                              onClick={() => detail(p)}
                              className="break-words text-left text-base font-medium"
                            >
                              {p.name}
                            </button>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {p.category}
                            </p>
                          </div>
                          <Status p={p} />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-mono text-2xl">
                              {p.stock}
                            </span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              unidades · mínimo {p.minimum}
                            </span>
                          </div>
                          <button
                            className="icon-button"
                            onClick={() => detail(p)}
                            aria-label={`Ver ${p.name}`}
                          >
                            <ArrowRight size={18} />
                          </button>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <Button
                            variant="outline"
                            className="h-11 bg-white text-success"
                            onClick={() => setModal({ kind: "in", product: p })}
                          >
                            <ArrowDownLeft size={17} />
                            Entrada
                          </Button>
                          <Button
                            variant="outline"
                            className="h-11 bg-white text-primary"
                            onClick={() =>
                              setModal({ kind: "out", product: p })
                            }
                          >
                            <ArrowUpRight size={17} />
                            Salida
                          </Button>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              ) : (
                <Empty
                  icon="product"
                  title={
                    hasFilters
                      ? "No encontramos productos"
                      : "Un buen inventario empieza aquí"
                  }
                  description={
                    hasFilters
                      ? "No hay productos que coincidan con tu búsqueda y filtros. Prueba con otros criterios."
                      : "Añade el primer producto de tu taller. Podrás controlar sus existencias y registrar cada entrada y salida."
                  }
                  action={
                    hasFilters ? (
                      <Button variant="outline" onClick={clearFilters}>
                        Limpiar filtros
                      </Button>
                    ) : (
                      <Button
                        className="h-11 rounded-lg px-5"
                        onClick={() => setModal({ kind: "create" })}
                      >
                        <Plus size={17} />
                        Crear primer producto
                      </Button>
                    )
                  }
                />
              )}
              <div className="flex min-h-16 flex-wrap items-center justify-between gap-2 border-t px-5 py-3 text-xs text-muted-foreground sm:px-6">
                <span aria-live="polite">
                  {list.length
                    ? `${(currentPage - 1) * 8 + 1}–${Math.min(currentPage * 8, list.length)} de ${list.length}`
                    : `0 ${history ? "movimientos" : "productos"}`}
                </span>
                <div className="flex items-center gap-2">
                  {!history && (
                    <>
                      <label htmlFor="sort" className="sr-only">
                        Ordenar productos
                      </label>
                      <select
                        id="sort"
                        className="mr-1 h-11 max-w-[150px] bg-transparent text-base"
                        value={sort}
                        onChange={(e) => filter("sort", e.target.value)}
                      >
                        <option value="recent">Más recientes</option>
                        <option value="name">Nombre: A a Z</option>
                        <option value="stock">Menor stock</option>
                      </select>
                    </>
                  )}
                  <button
                    className="icon-button border size-11"
                    disabled={currentPage <= 1}
                    onClick={() => setPage(currentPage - 1)}
                    aria-label="Página anterior"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className="px-1 font-mono">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    className="icon-button border size-11"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage(currentPage + 1)}
                    aria-label="Página siguiente"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </section>
            {selectedId && (
              <aside className="panel reveal min-w-0 overflow-hidden">
                <div className="flex items-center justify-between border-b p-5">
                  <h2 className="font-medium">Detalle del producto</h2>
                  <Button variant="ghost" size="icon" asChild>
                    <Link
                      href={`/${params.size ? "?" + params : ""}`}
                      aria-label="Cerrar detalle"
                    >
                      <X size={19} />
                    </Link>
                  </Button>
                </div>
                {selected ? (
                  <>
                    <div className="p-6">
                      <div className="mb-5 flex size-12 items-center justify-center rounded-lg border bg-background text-primary">
                        <Package size={23} />
                      </div>
                      <p className="eyebrow">#{selected.id.slice(0, 8)}</p>
                      <h3 className="mt-2 break-words text-xl font-semibold">
                        {selected.name}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {selected.category}
                      </p>
                      <div className="mt-4">
                        <Status p={selected} />
                      </div>
                      <div className="my-6 grid grid-cols-2 rounded-lg border bg-background/50 p-4">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Existencias
                          </p>
                          <p className="mt-2 font-mono text-3xl">
                            {selected.stock}
                          </p>
                        </div>
                        <div className="border-l pl-4">
                          <p className="text-xs text-muted-foreground">
                            Stock mínimo
                          </p>
                          <p className="mt-2 font-mono text-3xl">
                            {selected.minimum}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          className="h-11"
                          onClick={() =>
                            setModal({ kind: "in", product: selected })
                          }
                        >
                          <ArrowDownLeft size={16} />
                          Entrada
                        </Button>
                        <Button
                          variant="outline"
                          className="h-11 bg-white"
                          onClick={() =>
                            setModal({ kind: "out", product: selected })
                          }
                        >
                          <ArrowUpRight size={16} />
                          Salida
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        className="mt-2 h-11 w-full text-muted-foreground"
                        onClick={() =>
                          setModal({ kind: "edit", product: selected })
                        }
                      >
                        <Pencil size={15} />
                        Editar producto
                      </Button>
                    </div>
                    <div className="border-t p-6">
                      <h4 className="mb-4 text-sm font-medium">
                        Movimientos recientes
                      </h4>
                      {data.movements
                        .filter((m) => m.product_id === selected.id)
                        .slice(0, 5)
                        .map((m) => (
                          <div key={m.id} className="mb-4 flex gap-3">
                            <div
                              className={`mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg ${m.type === "in" ? "bg-emerald-50 text-success" : "bg-accent text-primary"}`}
                            >
                              {m.type === "in" ? (
                                <ArrowDownLeft size={16} />
                              ) : (
                                <ArrowUpRight size={16} />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex justify-between gap-2 text-xs">
                                <span className="font-medium">
                                  {m.type === "in" ? "Entrada" : "Salida"}
                                </span>
                                <span className="font-mono">
                                  {m.type === "in" ? "+" : "−"}
                                  {m.quantity}
                                </span>
                              </div>
                              <p className="mt-1 break-words text-xs text-muted-foreground">
                                {m.reason}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {date(m.created_at)} · {m.previous_stock} →{" "}
                                {m.resulting_stock}
                              </p>
                            </div>
                          </div>
                        ))}
                      {!data.movements.some(
                        (m) => m.product_id === selected.id,
                      ) && (
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          Este producto todavía no tiene movimientos.
                        </p>
                      )}
                      <Link
                        href={`/movements?product=${selected.id}`}
                        className="mt-2 flex min-h-11 items-center gap-2 text-sm font-medium text-primary"
                      >
                        Ver historial completo
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="p-6">
                    <p className="text-sm text-muted-foreground">
                      {readError
                        ? "No se pudo cargar el detalle."
                        : "No encontramos este producto."}
                    </p>
                    <Button variant="outline" asChild className="mt-4">
                      <Link href="/">Volver al inventario</Link>
                    </Button>
                  </div>
                )}
              </aside>
            )}
          </div>
          {!history && !selectedId && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <Info size={14} />
                El stock bajo se calcula según el mínimo de cada producto.
              </span>
              <Link
                href="/movements"
                className="flex min-h-11 items-center gap-2 text-sm font-medium text-primary"
              >
                Consultar movimientos
                <ArrowRight size={14} />
              </Link>
            </div>
          )}
          <footer className="mt-9 flex items-center justify-between border-t pt-5 text-xs text-muted-foreground">
            <span>
              Inventario Taller <span className="mx-2 text-muted-foreground">/</span> Un
              lugar para cada pieza.
            </span>
            <span className="hidden items-center gap-1.5 sm:flex">
              <ShieldCheck size={12} />
              Trazabilidad en cada movimiento
            </span>
          </footer>
        </main>
      </div>
      {modal && (
        <ProductDialog
          modal={modal}
          categories={data.categories}
          close={() => setModal(null)}
          saved={async (kind) => {
            setModal(null);
            setNotice(
              kind === "create"
                ? "Producto creado correctamente."
                : kind === "edit"
                  ? "Producto actualizado correctamente."
                  : kind === "in"
                    ? "Entrada registrada correctamente."
                    : "Salida registrada correctamente.",
            );
            await refresh();
          }}
        />
      )}
    </div>
  );
}
function Empty({
  icon,
  title,
  description,
  action,
}: {
  icon: string;
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-12 text-center sm:min-h-[390px]">
      <div className="relative mb-6 flex size-[76px] items-center justify-center rounded-2xl border border-primary/10 bg-accent/50 text-primary">
        <div className="absolute -left-2 -top-2 size-4 rounded border bg-white" />
        <div className="absolute -bottom-1 -right-1 size-5 rounded-md border bg-white" />
        {icon === "history" ? (
          <History size={32} strokeWidth={1.3} />
        ) : (
          <PackageOpen size={34} strokeWidth={1.3} />
        )}
      </div>
      <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
      <p className="mb-6 mt-2 max-w-[370px] text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action}
      {icon === "product" && (
        <div className="mt-7 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Check size={13} />
          Productos, existencias y movimientos en un solo lugar
        </div>
      )}
    </div>
  );
}
function ProductDialog({
  modal,
  categories,
  close,
  saved,
}: {
  modal: Modal;
  categories: Inventory["categories"];
  close: () => void;
  saved: (kind: string) => Promise<void>;
}) {
  const editing = modal.kind === "edit",
    movement = modal.kind === "in" || modal.kind === "out",
    p = modal.product;
  const [fields, setFields] = useState<Fields>(
      movement
        ? { quantity: "", reason: "" }
        : {
            name: p?.name ?? "",
            category: p?.category ?? "",
            stock: String(p?.stock ?? 0),
            minimum: String(p?.minimum ?? 0),
          },
    ),
    [errors, setErrors] = useState<Fields>({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false),
    [discard, setDiscard] = useState(false);
  const [original] = useState(() => JSON.stringify(fields));
  const idempotency = useRef(crypto.randomUUID()),
    lock = useRef(false);
  useEffect(() => {
    const activator = document.activeElement as HTMLElement | null;
    return () => {
      requestAnimationFrame(() => activator?.focus());
    };
  }, []);
  const dirty = JSON.stringify(fields) !== original;
  const title =
    modal.kind === "create"
      ? "Nuevo producto"
      : editing
        ? "Editar producto"
        : modal.kind === "in"
          ? "Registrar entrada"
          : "Registrar salida";
  function attemptClose() {
    if (busy) return;
    if (dirty) setDiscard(true);
    else close();
  }
  useEffect(() => {
    function prevent(e: BeforeUnloadEvent) {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  function change(key: string, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
    setConfirm(false);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (lock.current) return;
    const err = movement
      ? validateMovement(fields, p?.stock ?? 0, modal.kind)
      : validateProduct(fields, editing);
    setErrors(err);
    setError("");
    if (Object.keys(err).length) return;
    if (movement && !confirm) {
      setConfirm(true);
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      const r = await fetch(
        movement
          ? "/api/movements"
          : editing
            ? `/api/products/${p?.id}`
            : "/api/products",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            movement
              ? {
                  ...fields,
                  product_id: p?.id,
                  type: modal.kind,
                  idempotency_key: idempotency.current,
                }
              : fields,
          ),
        },
      );
      const result = await r.json();
      if (!r.ok) {
        setErrors(result.fields ?? {});
        throw Error(result.error ?? "No se pudo guardar. Inténtalo de nuevo.");
      }
      await saved(modal.kind);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo conectar con el servidor. Tus datos se han conservado.",
      );
      setConfirm(false);
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  const quantityError = fields.quantity
    ? validateMovement(fields, p?.stock ?? 0, modal.kind).quantity
    : undefined;
  const result =
    (p?.stock ?? 0) +
    (modal.kind === "out" ? -1 : 1) * (Number(fields.quantity) || 0);
  const field = (
    key: string,
    label: string,
    placeholder?: string,
    numeric = false,
  ) => (
    <div>
      <label htmlFor={`field-${key}`} className="label">
        {label}
      </label>
      <Input
        id={`field-${key}`}
        value={fields[key]}
        onChange={(e) => change(key, e.target.value)}
        placeholder={placeholder}
        type={numeric ? "number" : "text"}
        min={key === "quantity" ? 1 : 0}
        step={numeric ? 1 : undefined}
        inputMode={numeric ? "numeric" : undefined}
        list={key === "category" ? "categories" : undefined}
        maxLength={numeric ? undefined : key === "name" ? 120 : 80}
        disabled={busy}
        aria-invalid={!!errors[key]}
        aria-describedby={errors[key] ? `error-${key}` : undefined}
        className={`h-11 bg-white ${errors[key] ? "border-destructive" : ""}`}
      />
      {errors[key] && (
        <p id={`error-${key}`} className="mt-1.5 text-xs text-destructive">
          {errors[key]}
        </p>
      )}
    </div>
  );
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) attemptClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/35 backdrop-blur-[2px]" />
        <Dialog.Content
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            attemptClose();
          }}
          onPointerDownOutside={(e) => {
            e.preventDefault();
            attemptClose();
          }}
          className="reveal fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-32px)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border bg-white shadow-xl focus:outline-none"
        >
          <div className="flex items-start justify-between border-b px-6 py-5">
            <div>
              <Dialog.Title className="text-xl font-semibold tracking-tight">
                {discard ? "¿Descartar los cambios?" : title}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                {discard
                  ? "Tienes datos sin guardar en este formulario."
                  : movement
                    ? p?.name
                    : editing
                      ? "Actualiza los datos. El stock se modifica con movimientos."
                      : "Añade una referencia al inventario de tu taller."}
              </Dialog.Description>
            </div>
            <button
              className="icon-button -mr-2 -mt-1"
              onClick={attemptClose}
              aria-label="Cerrar formulario"
            >
              <X size={19} />
            </button>
          </div>
          {discard ? (
            <div className="p-6">
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={() => setDiscard(false)}
                >
                  Seguir editando
                </Button>
                <Button variant="destructive" className="h-11" onClick={close}>
                  Descartar cambios
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <div className="space-y-5 p-6">
                {movement ? (
                  <>
                    <div className="rounded-lg border bg-background p-4">
                      <p className="text-xs text-muted-foreground">
                        Existencias actuales
                      </p>
                      <p className="mt-1 font-mono text-2xl">
                        {p?.stock}
                        <span className="ml-2 font-sans text-sm text-muted-foreground">
                          unidades
                        </span>
                      </p>
                    </div>
                    {field(
                      "quantity",
                      "Cantidad",
                      "Introduce la cantidad",
                      true,
                    )}
                    <div>
                      <label htmlFor="field-reason" className="label">
                        Motivo{" "}
                        <span className="font-normal text-muted-foreground">
                          (obligatorio)
                        </span>
                      </label>
                      <textarea
                        id="field-reason"
                        value={fields.reason}
                        onChange={(e) => change("reason", e.target.value)}
                        disabled={busy}
                        rows={3}
                        maxLength={500}
                        placeholder={
                          modal.kind === "in"
                            ? "¿Por qué entra este material?"
                            : "¿Para qué se retira este material?"
                        }
                        aria-invalid={!!errors.reason}
                        aria-describedby={
                          errors.reason ? "error-reason" : undefined
                        }
                        className="w-full resize-y rounded-lg border bg-white px-3 py-3 text-base"
                      />
                      {errors.reason && (
                        <p
                          id="error-reason"
                          className="mt-1 text-xs text-destructive"
                        >
                          {errors.reason}
                        </p>
                      )}
                    </div>
                    <div
                      role="status"
                      aria-live="polite"
                      className={`rounded-lg border p-4 ${quantityError ? "border-destructive bg-red-50" : "border-primary/20 bg-accent/50"}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm">
                          {quantityError ? "Existencias sin cambios" : "Existencias después"}
                        </span>
                        <span className="font-mono text-xl">
                          {quantityError ? p?.stock : result}{" "}
                          <span className="font-sans text-xs text-muted-foreground">
                            unidades
                          </span>
                        </span>
                      </div>
                      {quantityError && (
                        <p className="mt-2 text-sm text-destructive">
                          {modal.kind === "out" ? "Salida no válida" : "Entrada no válida"}: {quantityError}
                        </p>
                      )}
                    </div>
                    {confirm && (
                      <div
                        role="status"
                        className="reveal rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-warning"
                      >
                        Revisa la cantidad y el motivo. Este movimiento quedará
                        registrado y no se podrá editar.
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {field(
                      "name",
                      "Nombre del producto",
                      "Nombre de la pieza o material",
                    )}
                    {field(
                      "category",
                      "Categoría",
                      "Selecciona o escribe una categoría",
                    )}
                    <datalist id="categories">
                      {categories.map((c) => (
                        <option key={c.id} value={c.name} />
                      ))}
                    </datalist>
                    <p className="!mt-2 text-xs text-muted-foreground">
                      Si la categoría no existe, la crearemos al guardar.
                    </p>
                    <div className={editing ? "" : "grid grid-cols-2 gap-4"}>
                      {!editing &&
                        field(
                          "stock",
                          "Existencias iniciales",
                          undefined,
                          true,
                        )}
                      {field("minimum", "Stock mínimo", undefined, true)}
                    </div>
                    <p className="!mt-2 text-xs leading-relaxed text-muted-foreground">
                      {editing
                        ? "Las existencias se conservan. Registra una entrada o salida para modificarlas."
                        : "Te indicaremos stock bajo cuando las existencias lleguen a este mínimo."}
                    </p>
                  </>
                )}
                {error && (
                  <p
                    role="alert"
                    className="rounded-lg bg-red-50 p-3 text-sm text-destructive"
                  >
                    {error}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3 border-t bg-background/50 px-6 py-4">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 bg-white"
                  onClick={attemptClose}
                  disabled={busy}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="h-11" disabled={busy}>
                  {busy ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Guardando…
                    </>
                  ) : movement ? (
                    confirm ? (
                      `Confirmar ${modal.kind === "in" ? "entrada" : "salida"} de ${fields.quantity} ${Number(fields.quantity) === 1 ? "unidad" : "unidades"}`
                    ) : (
                      "Revisar movimiento"
                    )
                  ) : editing ? (
                    "Guardar cambios"
                  ) : (
                    "Crear producto"
                  )}
                </Button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
