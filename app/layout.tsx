import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Inventario Taller · Control de inventario",
  description:
    "Productos, existencias y movimientos de tu taller en un solo lugar.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
