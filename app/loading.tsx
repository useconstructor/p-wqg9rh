export default function Loading() {
  return (
    <div
      className="min-h-screen bg-background p-6 lg:pl-[272px]"
      role="status"
      aria-label="Cargando inventario"
    >
      <div className="mb-8 h-16 animate-pulse rounded-xl bg-white" />
      <div className="mb-7 grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-xl border bg-white"
          />
        ))}
      </div>
      <div className="h-[480px] animate-pulse rounded-xl border bg-white" />
      <span className="sr-only">Cargando inventario…</span>
    </div>
  );
}
