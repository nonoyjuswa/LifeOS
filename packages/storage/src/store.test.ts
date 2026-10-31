import "fake-indexeddb/auto";
import { describe, it, expect, afterEach } from "vitest";
import {
  getToday, scheduleItem, completeItem, type Item,
} from "@lifeos/core";
import { openDatabase, type LifeOSDB } from "./db";
import { Store } from "./store";

const open: LifeOSDB[] = [];
let n = 0;
function freshName() {
  n += 1;
  return `test-db-${n}`;
}
function makeStore(name = freshName()) {
  const db = openDatabase(name);
  open.push(db);
  return { name, store: new Store(db, () => "2026-10-29T10:00:00Z") };
}

afterEach(async () => {
  for (const db of open.splice(0)) {
    db.close();
    await db.delete();
  }
});

describe("capture", () => {
  it("saves a thought to the inbox", async () => {
    const { store } = makeStore();
    const item = await store.capture("buy charger");
    expect(item?.status).toBe("inbox");
    const saved = await store.get("items", item!.id);
    expect(saved?.text).toBe("buy charger");
  });

  it("ignores blank captures", async () => {
    const { store } = makeStore();
    expect(await store.capture("   ")).toBeUndefined();
    expect((await store.snapshot()).items).toHaveLength(0);
  });

  it("survives closing and reopening the app", async () => {
    const { name, store } = makeStore();
    await store.capture("remember this");
    store.db.close();

    const reopened = new Store(openDatabase(name));
    open.push(reopened.db);
    const { items } = await reopened.snapshot();
    expect(items.map((i) => i.text)).toEqual(["remember this"]);
  });
});

describe("storage feeds the core", () => {
  it("capture -> plan -> Today -> done, end to end", async () => {
    const { store } = makeStore();
    const now = "2026-10-29T21:00:00Z";

    const captured = (await store.capture("submit report"))!;
    await store.put("items", scheduleItem(captured, "2026-10-30", now));

    let snap = await store.snapshot();
    let today = getToday({ date: "2026-10-30", ...snap });
    expect(today.todo.map((e) => e.text)).toEqual(["submit report"]);

    const planned = (await store.get("items", captured.id)) as Item;
    await store.put("items", completeItem(planned, "2026-10-30T09:00:00Z", "2026-10-30"));

    snap = await store.snapshot();
    today = getToday({ date: "2026-10-30", ...snap });
    expect(today.todo).toHaveLength(0);
    expect(today.done.map((e) => e.text)).toEqual(["submit report"]);
  });

  it("keeps soft-deleted records stored but hidden from Today", async () => {
    const { store } = makeStore();
    const item = (await store.capture("oops"))!;
    await store.put("items", {
      ...scheduleItem(item, "2026-10-30", "2026-10-29T21:00:00Z"),
      deletedAt: "2026-10-29T22:00:00Z",
    });
    const snap = await store.snapshot();
    expect(snap.items).toHaveLength(1);
    expect(getToday({ date: "2026-10-30", ...snap }).todo).toHaveLength(0);
  });
});

describe("settings and device id", () => {
  it("returns the fallback until a setting is saved", async () => {
    const { store } = makeStore();
    expect(await store.getSetting("dayStartsAt", "04:00")).toBe("04:00");
    await store.setSetting("dayStartsAt", "05:00");
    expect(await store.getSetting("dayStartsAt", "04:00")).toBe("05:00");
  });

  it("creates one device id and keeps it", async () => {
    const { store } = makeStore();
    const first = await store.deviceId();
    expect(await store.deviceId()).toBe(first);
  });
});