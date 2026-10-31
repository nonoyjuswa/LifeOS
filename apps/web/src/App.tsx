import { useState } from "react";
import { Capture } from "./Capture";
import { Today } from "./Today";
import { Plan } from "./Plan";
import { Inbox } from "./Inbox";

type Tab = "today" | "plan" | "inbox";
const TABS: { id: Tab; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "plan", label: "Plan" },
  { id: "inbox", label: "Inbox" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("today");
  const [planDate, setPlanDate] = useState<string | null>(null);

  return (
    <main>
      <h1>LifeOS</h1>
      <Capture />

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "tab on" : "tab"}
            onClick={() => {
              if (t.id === "plan") setPlanDate(null); // opening Plan always starts at tomorrow
              setTab(t.id);
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "today" && (
        <Today onPlan={(d) => { setPlanDate(d); setTab("plan"); }} />
      )}
      {tab === "plan" && <Plan date={planDate} setDate={setPlanDate} />}
      {tab === "inbox" && <Inbox />}
    </main>
  );
}