import { useState } from "react";
import type { Recurrence } from "@lifeos/core";
import { addRecurrence, removeRecurrence } from "./actions";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function describe(rec: Recurrence): string {
  const latest = [...rec.schedules].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  if (!latest) return "";
  const days = latest.daysOfWeek.map((d) => DAYS[d]).join(", ");
  return latest.time ? `${days} at ${latest.time}` : days;
}

export function Repeating({ recurrences, today }: { recurrences: Recurrence[]; today: string }) {
  const [text, setText] = useState("");
  const [days, setDays] = useState<number[]>([]);
  const [time, setTime] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");

  const live = recurrences.filter((r) => !r.deletedAt);

  async function add() {
    try {
      await addRecurrence(
        {
          text,
          daysOfWeek: days,
          time: time || undefined,
          category: (category || undefined) as Recurrence["category"],
        },
        today
      );
      setText(""); setDays([]); setTime(""); setCategory(""); setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save");
    }
  }

  return (
    <div className="block">
      <h3>Repeating things</h3>
      <ul className="list">
        {live.map((rec) => (
          <li key={rec.id} className="card">
            <div className="text">
              {rec.text} {rec.category && <span className="tag">{rec.category}</span>}
            </div>
            <div className="meta">{describe(rec)}</div>
            <div className="actions">
              <button className="danger" onClick={() => void removeRecurrence(rec)}>Remove</button>
            </div>
          </li>
        ))}
        {live.length === 0 && <li className="empty">None yet.</li>}
      </ul>

      <div className="card form">
        <input
          placeholder="e.g. Gym"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="days">
          {DAYS.map((label, d) => (
            <button
              key={label}
              type="button"
              className={days.includes(d) ? "chip on" : "chip"}
              onClick={() => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d])}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="form-row">
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">No category</option>
            <option>Health</option>
            <option>Skills</option>
            <option>Money</option>
          </select>
          <button onClick={() => void add()}>Add</button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}