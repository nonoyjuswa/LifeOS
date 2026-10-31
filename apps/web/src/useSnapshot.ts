import type { Snapshot } from "@lifeos/storage";
import { store } from "./store";
import { useLive } from "./useLive";

export function useSnapshot(): Snapshot | undefined {
  return useLive<Snapshot | undefined>(() => store.snapshot(), undefined);
}