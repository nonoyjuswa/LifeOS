import {
  addDays, dropItem, scheduleItem, logicalDate, toLocalWallClock,
  DEFAULT_DAY_STARTS_AT, type Item,
} from "@lifeos/core";
import { db, store } from "./store";
import { useLive } from "./useLive";

async function planForTomorrow(item: Item) {
  const dayStart = await store.getSetting("dayStartsAt", DEFAULT_DAY_STARTS_AT);
  const today = logicalDate(toLocalWallClock(new Date()), dayStart);
  await store.put("items", scheduleItem(item, addDays(today, 1), new Date().toISOString()));
}

async function drop(item: Item) {
  await store.put("items", dropItem(item, new Date().toISOString()));
}

export function Inbox() {
  const items = useLive(async () => {
    const rows = await db.items
      .where("status").equals("inbox")
      .filter((i) => !i.deletedAt)
      .toArray();
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [] as Item[]);

  return (
    <section>
      <h2>Inbox <span className="count">{items.length}</span></h2>
      {items.length === 0 && <p className="empty">Nothing waiting. Capture a thought above.</p>}
      <ul className="inbox">
        {items.map((item) => (
          <li key={item.id}>
            <div className="text">{item.text}</div>
            <div className="meta">
              {new Date(item.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
            </div>
            <div className="actions">
              <button onClick={() => void planForTomorrow(item)}>Tomorrow</button>
              <button className="danger" onClick={() => void drop(item)}>Drop</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}