"use client";
import { useLabPassed } from "@/lib/lab/progress";

export function LabPassedBadge({ id }: { id: string }) {
  const passed = useLabPassed();
  if (!passed[id]) return null;
  return <span className="chip" style={{ color: "var(--good)" }}>✓ Passed</span>;
}

export function LabPassedCount({ ids }: { ids: string[] }) {
  const passed = useLabPassed();
  const n = ids.filter((i) => passed[i]).length;
  if (!n) return null;
  return <span className="text-sm muted">{n} of {ids.length} passed</span>;
}
