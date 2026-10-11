import { readInventory } from "@/lib/inventory";
import Workspace from "@/components/workspace";
export const dynamic = "force-dynamic";
export default async function Detail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const initial = await readInventory().catch(() => null);
  return <Workspace initial={initial} selectedId={id} />;
}
