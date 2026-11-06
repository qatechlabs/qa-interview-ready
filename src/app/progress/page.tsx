import { allQuestions, toSummary } from "@/content";
import { ProgressDashboard } from "@/components/ProgressDashboard";
import { ALL_SCENARIOS, labApp } from "@/lab/scenarios";

export const metadata = { title: "My progress" };

export default function ProgressPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My progress</h1>
      <ProgressDashboard summaries={allQuestions().map(toSummary)} labs={ALL_SCENARIOS.map((s) => ({ id: s.id, title: s.title, app: labApp(s.app).name, free: !!s.free }))} />
    </div>
  );
}
