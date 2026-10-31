import { useEffect, useState } from "react";
import { logicalDate, toLocalWallClock, DEFAULT_DAY_STARTS_AT } from "@lifeos/core";
import { store } from "./store";

export function currentDate(dayStart: string = DEFAULT_DAY_STARTS_AT): string {
  return logicalDate(toLocalWallClock(new Date()), dayStart);
}

export function useToday(): string {
  const [date, setDate] = useState(() => currentDate());

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      const dayStart = await store.getSetting("dayStartsAt", DEFAULT_DAY_STARTS_AT);
      if (alive) setDate(currentDate(dayStart));
    };
    void refresh();
    const timer = setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return date;
}