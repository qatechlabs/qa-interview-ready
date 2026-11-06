"use client";
import { useProgress } from "@/lib/progress";

export function ProgressButtons({ id }: { id: string }) {
  const { state, toggle } = useProgress();
  const done = !!state.done[id];
  const saved = !!state.bookmarks[id];
  const again = !!state.again[id];
  return (
    <div className="flex flex-wrap gap-2">
      <button className={`btn ${done ? "btn-primary" : "btn-ghost"}`} onClick={() => { toggle("done", id); if (!done) toggle("again", id, false); }} aria-pressed={done}>
        {done ? "✓ Done" : "Mark as done"}
      </button>
      <button className="btn btn-ghost" onClick={() => toggle("again", id)} aria-pressed={again} style={again ? { color: "var(--warn)", borderColor: "var(--warn)" } : undefined}>
        ↻ {again ? "In practice-again list" : "Practice again"}
      </button>
      <button className="btn btn-ghost" onClick={() => toggle("bookmarks", id)} aria-pressed={saved} style={saved ? { color: "var(--accent)", borderColor: "var(--accent)" } : undefined}>
        {saved ? "★ Bookmarked" : "☆ Bookmark"}
      </button>
    </div>
  );
}
