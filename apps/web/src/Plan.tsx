import type { ReactNode } from "react";
import { addDays, getPlan, scheduleOn, type Item } from "@lifeos/core";
import { useSnapshot } from "./useSnapshot";
import { useToday } from "./useToday";
import { Repeating } from "./Repeating";
import { planItem, toBacklog, drop, changeTime, reorder } from "./actions";

function Card({ item, children }: { item: Item; children: ReactNode }) {
  return (
    <li className="card">
      <div className="text">{item.text}</div>
      <div className="actions">{children}</div>
    </li>
  );
}

export function Plan({
  date,
  setDate,
}: {
  date: string | null;
  setDate: (d: string | null) => void;
}) {
  const today = useToday();
  const snap = useSnapshot();
  if (!snap) return <p className="empty">Loading…</p>;

  const planDate = date ?? addDays(today, 1);
  const plan = getPlan({ date: planDate, items: snap.items, recurrences: snap.recurrences });

  const timed = plan.fixed.scheduled
    .filter((i) => i.scheduledTime)
    .sort((a, b) => a.scheduledTime!.localeCompare(b.scheduledTime!));
  const untimed = plan.fixed.scheduled.filter((i) => !i.scheduledTime);

  const pretty = new Date(`${planDate}T00:00:00`).toLocaleDateString([], {
    weekday: "long", month: "short", day: "numeric",
  });
  const label = planDate === addDays(today, 1) ? "tomorrow" : planDate === today ? "today" : "that day";

  return (
    <section>
      <h2>Plan for {pretty}</h2>
      <div className="form-row">
        <input type="date" value={planDate} onChange={(e) => setDate(e.target.value || null)} />
        {date !== null && <button onClick={() => setDate(null)}>Back to tomorrow</button>}
      </div>

      {plan.leftovers.length > 0 && (
        <div className="block">
          <h3>Didn't get to these <span className="count">{plan.leftovers.length}</span></h3>
          <ul className="list">
            {plan.leftovers.map((item) => (
              <Card key={item.id} item={item}>
                <button onClick={() => void planItem(item, planDate)}>Move to {label}</button>
                <button onClick={() => void toBacklog(item)}>Backlog</button>
                <button className="danger" onClick={() => void drop(item)}>Drop</button>
              </Card>
            ))}
          </ul>
        </div>
      )}

      <div className="block">
        <h3>The day</h3>
        <ul className="list">
          {plan.fixed.recurrences.map((rec) => (
            <li key={rec.id} className="card fixed">
              <div className="text">
                {scheduleOn(rec, planDate)?.time && (
                  <span className="time">{scheduleOn(rec, planDate)?.time}</span>
                )}
                {rec.text} <span className="tag">repeats</span>
              </div>
            </li>
          ))}

          {plan.fixed.due.map((item) => (
            <Card key={item.id} item={item}>
              <span className="tag warn">due</span>
              <button onClick={() => void planItem(item, planDate)}>Plan it</button>
            </Card>
          ))}

          {timed.map((item) => (
            <Card key={item.id} item={item}>
              <input
                type="time"
                value={item.scheduledTime ?? ""}
                onChange={(e) => void changeTime(item, e.target.value)}
              />
              <button onClick={() => void toBacklog(item)}>Remove</button>
            </Card>
          ))}

          {untimed.map((item, index) => (
            <Card key={item.id} item={item}>
              <input
                type="time"
                value=""
                aria-label="Set a time"
                onChange={(e) => void changeTime(item, e.target.value)}
              />
              <button disabled={index === 0} onClick={() => void reorder(untimed, index, -1)}>↑</button>
              <button disabled={index === untimed.length - 1} onClick={() => void reorder(untimed, index, 1)}>↓</button>
              <button onClick={() => void toBacklog(item)}>Remove</button>
            </Card>
          ))}
        </ul>
        {plan.fixed.scheduled.length === 0 && plan.fixed.due.length === 0 && (
          <p className="empty">Nothing chosen yet. Pick from below.</p>
        )}
      </div>

      <div className="block">
        <h3>Pick more</h3>
        <h4>Inbox <span className="count">{plan.inbox.length}</span></h4>
        <ul className="list">
          {plan.inbox.map((item) => (
            <Card key={item.id} item={item}>
              <button onClick={() => void planItem(item, planDate)}>Add to {label}</button>
              <button onClick={() => void toBacklog(item)}>Backlog</button>
              <button className="danger" onClick={() => void drop(item)}>Drop</button>
            </Card>
          ))}
          {plan.inbox.length === 0 && <li className="empty">Inbox is clear.</li>}
        </ul>

        <h4>Backlog <span className="count">{plan.backlog.length}</span></h4>
        <ul className="list">
          {plan.backlog.map((item) => (
            <Card key={item.id} item={item}>
              <button onClick={() => void planItem(item, planDate)}>Add to {label}</button>
              <button className="danger" onClick={() => void drop(item)}>Drop</button>
            </Card>
          ))}
          {plan.backlog.length === 0 && <li className="empty">Nothing in the backlog.</li>}
        </ul>
      </div>

      <Repeating recurrences={snap.recurrences} today={today} />
    </section>
  );
}