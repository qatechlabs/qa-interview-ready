import "server-only";
import { FREE_PER_LEVEL } from "@/lib/config";
import type { LevelId, Question, QuestionInput, QuestionSummary } from "./types";
import fresher from "./questions/fresher.json";
import junior from "./questions/junior.json";
import mid from "./questions/mid.json";
import senior from "./questions/senior.json";
import architect from "./questions/architect.json";

const RAW = { fresher, junior, mid, senior, architect } as unknown as Record<LevelId, QuestionInput[]>;

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-[^-]*$/, (m, off, str) => (str.length < 80 ? m : ""))
    .replace(/-+$/g, "");
}

const ALL: Question[] = [];
const BY_ID = new Map<string, Question>();
for (const level of Object.keys(RAW) as LevelId[]) {
  RAW[level].forEach((input, i) => {
    let id = `${level}-${slugify(input.q)}`;
    if (BY_ID.has(id)) id = `${id}-${i + 1}`;
    const q: Question = { ...input, id, level, order: i + 1, free: i < FREE_PER_LEVEL };
    ALL.push(q);
    BY_ID.set(id, q);
  });
}

export function toSummary(q: Question): QuestionSummary {
  return { id: q.id, level: q.level, order: q.order, topic: q.topic, module: q.module, q: q.q, free: q.free };
}

export function allQuestions() {
  return ALL;
}

export function questionsForLevel(level: LevelId) {
  return ALL.filter((q) => q.level === level);
}

export function getQuestion(id: string) {
  return BY_ID.get(id);
}

export function neighbours(q: Question) {
  const list = questionsForLevel(q.level);
  return { prev: list[q.order - 2], next: list[q.order] };
}

export function modulesForLevel(level: LevelId) {
  const out: { module: string; questions: Question[] }[] = [];
  for (const q of questionsForLevel(level)) {
    const last = out[out.length - 1];
    if (last && last.module === q.module) last.questions.push(q);
    else out.push({ module: q.module, questions: [q] });
  }
  return out;
}

export function searchQuestions(term: string, opts: { level?: string; topic?: string } = {}) {
  const words = term.toLowerCase().split(/\s+/).filter(Boolean);
  return ALL.filter((q) => {
    if (opts.level && q.level !== opts.level) return false;
    if (opts.topic && q.topic !== opts.topic) return false;
    if (!words.length) return true;
    // Search is over the question text and module only, so locked answers are never revealed.
    const hay = `${q.q} ${q.module} ${q.topic}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
