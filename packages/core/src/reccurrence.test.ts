import { describe, it, expect } from "vitest";
import { createRecurrence, deleteRecurrence } from "./recurrence";
import { getToday, recurrenceAppliesOn } from "./today";
import { setItemTime, moveWithin } from "./planning";
import type { Item } from "./types";

const now = "2026-10-29T20:00:00Z";

describe("createRecurrence", () => {
  it("builds a rule that starts today", () => {
    const rec = createRecurrence(
      { text: " Gym ", daysOfWeek: [5, 1, 3, 1], time: "18:00", category: "Health" },
      "2026-10-29", now, "gym"
    );
    expect(rec.text).toBe("Gym");
    expect(rec.schedules).toEqual([
      { effectiveFrom: "2026-10-29", daysOfWeek: [1, 3, 5], time: "18:00" },
    ]);
    expect(rec.startDate).toBe("2026-10-29");
    expect(rec.paused).toBe(false);
  });

  it("rejects a blank name or no days", () => {
    expect(() => createRecurrence({ text: " ", daysOfWeek: [1] }, "2026-10-29", now)).toThrow();
    expect(() => createRecurrence({ text: "Gym", daysOfWeek: [] }, "2026-10-29", now)).toThrow();
  });

  it("shows up on Today only on its days", () => {
    const rec = createRecurrence({ text: "Gym", daysOfWeek: [1, 3, 5] }, "2026-10-29", now, "gym");
    expect(recurrenceAppliesOn(rec, "2026-10-30")).toBe(true);  // Friday
    expect(recurrenceAppliesOn(rec, "2026-10-31")).toBe(false); // Saturday
    const view = getToday({ date: "2026-10-30", items: [], recurrences: [rec], completions: [] });
    expect(view.todo.map((e) => e.text)).toEqual(["Gym"]);
  });

  it("stops appearing once deleted", () => {
    const rec = createRecurrence({ text: "Gym", daysOfWeek: [5] }, "2026-10-29", now, "gym");
    expect(recurrenceAppliesOn(deleteRecurrence(rec, now), "2026-10-30")).toBe(false);
  });
});

describe("planning helpers", () => {
  const base: Item = {
    id: "a", text: "task", status: "active", source: "app",
    createdAt: now, updatedAt: now, scheduledFor: "2026-10-30",
  };

  it("sets and clears a time", () => {
    const timed = setItemTime(base, "08:00", now);
    expect(timed.scheduledTime).toBe("08:00");
    expect(setItemTime(timed, undefined, now).scheduledTime).toBeUndefined();
  });

  it("moves entries and stops at the edges", () => {
    expect(moveWithin(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
    expect(moveWithin(["a", "b", "c"], 1, 1)).toEqual(["a", "c", "b"]);
    expect(moveWithin(["a", "b", "c"], 0, -1)).toEqual(["a", "b", "c"]);
    expect(moveWithin(["a", "b", "c"], 2, 1)).toEqual(["a", "b", "c"]);
  });
});