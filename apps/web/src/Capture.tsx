import { useRef, useState } from "react";
import { store } from "./store";

export function Capture() {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);

  async function save() {
    if (!text.trim()) return;
    try {
      await store.capture(text, "quick");
    } catch (e) {
      console.error(e);
      return; // keep the text in the box so nothing is lost
    }
    setText("");
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
    box.current?.focus();
  }

  return (
    <section className="capture">
      <textarea
        ref={box}
        autoFocus
        rows={3}
        placeholder="What's on your mind?"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void save();
          }
        }}
      />
      <div className="capture-row">
        <span className="hint">{saved ? "Saved to Inbox ✓" : "Enter to save · Shift+Enter for a new line"}</span>
        <button onClick={() => void save()} disabled={!text.trim()}>
          Capture
        </button>
      </div>
    </section>
  );
}