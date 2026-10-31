import { useEffect, useState } from "react";
import { liveQuery } from "dexie";

export function useLive<T>(querier: () => Promise<T>, initial: T): T {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    const sub = liveQuery(querier).subscribe({
      next: setValue,
      error: (e) => console.error("live query failed", e),
    });
    return () => sub.unsubscribe();
  }, []);
  return value;
}