import { readInventory } from "@/lib/inventory";
import Workspace from "@/components/workspace";
export const dynamic = "force-dynamic";
export default async function Home() {
  const initial = await readInventory().catch(() => null);
  return <Workspace initial={initial} />;
}
