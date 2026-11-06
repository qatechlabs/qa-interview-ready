"use client";
import { useEffect, useState } from "react";

/** A 60-second timer to rehearse the answer out loud. */
export function SpeakTimer() {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (left === null || left <= 0) return;
    const t = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  const running = left !== null && left > 0;
  return (
    <button className="btn btn-ghost !py-1 text-xs" onClick={() => setLeft(running ? null : 60)}>
      {left === null ? "▶ Rehearse in 60s" : left > 0 ? `⏱ ${left}s · stop` : "Time's up · again"}
    </button>
  );
}
