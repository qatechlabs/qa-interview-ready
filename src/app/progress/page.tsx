import { allQuestions, toSummary } from "@/content";
import { ProgressDashboard } from "@/components/ProgressDashboard";

export const metadata = { title: "My progress" };

export default function ProgressPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My progress</h1>
      <ProgressDashboard summaries={allQuestions().map(toSummary)} />
    </div>
  );
}
