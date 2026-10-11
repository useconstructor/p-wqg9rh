import { readInventory } from "@/lib/inventory";
import Workspace from "@/components/workspace";
export const dynamic = "force-dynamic";
export default async function History() {
  const initial = await readInventory().catch(() => null);
  return <Workspace initial={initial} view="movements" />;
}
