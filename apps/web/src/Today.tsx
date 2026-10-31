import { getToday, type TodayEntry } from "@lifeos/core";
import { useSnapshot } from "./useSnapshot";
import { useToday } from "./useToday";
import {
  checkItem, uncheckItem, tickRecurrence, untickRecurrence, planItem, drop,
} from "./actions";

function Row({ entry, date, done }: { entry: TodayEntry; date: string; done: boolean }) {
  function toggle() {
    if (entry.kind === "item" && entry.item) {
      void (done ? uncheckItem(entry.item) : checkItem(entry.item, date));
    } else if (entry.kind === "recurrence" && entry.recurrence) {
      void (done ? untickRecurrence(entry.recurrence, date) : tickRecurrence(entry.recurrence, date));
    }
  }
  return (
    <li className={done ? "row done" : "row"}>
      <label>
        <input type="checkbox" checked={done} onChange={toggle} />
        {entry.time && <span className="time">{entry.time}</span>}
        <span className="label">{entry.text}</span>
        {entry.kind === "recurrence" && <span className="tag">repeats</span>}
      </label>
    </li>
  );
}

export function Today({ onPlan }: { onPlan: (date: string) => void }) {
  const date = useToday();
  const snap = useSnapshot();
  if (!snap) return <p className="empty">Loading…</p>;

  const view = getToday({
    date,
    items: snap.items,
    recurrences: snap.recurrences,
    completions: snap.completions,
  });

  const pretty = new Date(`${date}T00:00:00`).toLocaleDateString([], {
    weekday: "long", month: "long", day: "numeric",
  });
  const nothingAtAll = view.todo.length === 0 && view.done.length === 0;

  return (
    <section>
      <h2>{pretty}</h2>

      {view.needsPlanning && (
        <div className="banner">
          <p>You haven't planned today.</p>
          <button onClick={() => onPlan(date)}>Plan now</button>
        </div>
      )}

      {view.needsPlanning && view.leftovers.length > 0 && (
        <div className="block">
          <h3>Left over from earlier</h3>
          <ul className="list">
            {view.leftovers.map((item) => (
              <li key={item.id} className="card">
                <div className="text">{item.text}</div>
                <div className="actions">
                  <button onClick={() => void planItem(item, date)}>Do today</button>
                  <button className="danger" onClick={() => void drop(item)}>Drop</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {view.dueUnplanned.length > 0 && (
        <div className="block">
          <h3>Due today, not planned</h3>
          <ul className="list">
            {view.dueUnplanned.map((item) => (
              <li key={item.id} className="card">
                <div className="text">{item.text}</div>
                <div className="actions">
                  <button onClick={() => void planItem(item, date)}>Do today</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {view.todo.length > 0 && (
        <ul className="list">
          {view.todo.map((e) => <Row key={`${e.kind}:${e.id}`} entry={e} date={date} done={false} />)}
        </ul>
      )}

      {view.todo.length === 0 && view.done.length > 0 && (
        <p className="empty">All done for today ✓</p>
      )}

      {nothingAtAll && !view.needsPlanning && <p className="empty">Nothing on the list.</p>}

      {view.done.length > 0 && (
        <div className="block">
          <h3>Done <span className="count">{view.done.length}</span></h3>
          <ul className="list">
            {view.done.map((e) => <Row key={`${e.kind}:${e.id}`} entry={e} date={date} done />)}
          </ul>
        </div>
      )}
    </section>
  );
}