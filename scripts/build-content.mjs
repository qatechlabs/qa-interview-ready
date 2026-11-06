// Converts the authored Markdown question banks in /content/*.md into JSON
// that the app imports. Runs automatically before `dev` and `build`.
//
// Format:
//   # Module: <module name>
//   ## <question text>
//   @topic <topic-id>
//   ### 60s
//   ### Explain
//   ### Example
//   ### Code <lang> [| <label>]   followed by a fenced code block
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SRC = path.join(ROOT, "content");
const OUT = path.join(ROOT, "src/content/questions");
const LEVELS = ["fresher", "junior", "mid", "senior", "architect"];
const TOPICS = ["fundamentals", "test-design", "sql", "git", "programming", "selenium", "playwright", "api", "framework", "cicd", "performance", "strategy"];
const LANGS = ["java", "typescript", "python", "sql", "bash", "yaml", "javascript", "json", "gherkin", "text", "groovy", "xml"];

function parse(file) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  const out = [];
  let module = null;
  let q = null;
  let section = null;
  let fence = null; // { lang, label, lines }
  const errors = [];
  const flush = () => {
    if (!q) return;
    for (const k of ["a60", "explain", "example"]) {
      q[k] = (q[k] || "").trim();
      if (!q[k]) errors.push(`${path.basename(file)}: "${q.q}" is missing ${k}`);
    }
    if (!TOPICS.includes(q.topic)) errors.push(`${path.basename(file)}: "${q.q}" has invalid topic "${q.topic}"`);
    if (!q.code.length) delete q.code;
    out.push(q);
    q = null;
  };
  lines.forEach((line, i) => {
    if (fence) {
      if (/^```\s*$/.test(line)) {
        if (fence.started) {
          q.code.push({ lang: fence.lang, ...(fence.label ? { label: fence.label } : {}), code: fence.lines.join("\n") });
          fence = null;
        } else fence.started = true;
        return;
      }
      if (/^```\w*\s*$/.test(line) && !fence.started) { fence.started = true; return; }
      if (fence.started) fence.lines.push(line);
      return;
    }
    let m;
    if ((m = line.match(/^# Module:\s*(.+)$/))) { flush(); module = m[1].trim(); return; }
    if ((m = line.match(/^## (.+)$/))) {
      flush();
      if (!module) errors.push(`${path.basename(file)}:${i + 1} question before any module`);
      q = { topic: "", module, q: m[1].trim(), a60: "", explain: "", example: "", code: [] };
      section = null;
      return;
    }
    if (!q) return;
    if ((m = line.match(/^@topic\s+(\S+)/))) { q.topic = m[1]; return; }
    if ((m = line.match(/^### Code\s+(\w+)\s*(?:\|\s*(.+))?$/))) {
      if (!LANGS.includes(m[1])) errors.push(`${path.basename(file)}:${i + 1} unknown code lang ${m[1]}`);
      fence = { lang: m[1], label: m[2]?.trim(), lines: [], started: false };
      section = null;
      return;
    }
    if (/^### 60s/.test(line)) { section = "a60"; return; }
    if (/^### Explain/.test(line)) { section = "explain"; return; }
    if (/^### Example/.test(line)) { section = "example"; return; }
    if (section) q[section] += line + "\n";
  });
  flush();
  if (fence) errors.push(`${path.basename(file)}: unclosed code fence`);
  return { questions: out, errors };
}

fs.mkdirSync(OUT, { recursive: true });
let allErrors = [];
const counts = {};
for (const level of LEVELS) {
  const file = path.join(SRC, `${level}.md`);
  const { questions, errors } = fs.existsSync(file) ? parse(file) : { questions: [], errors: [] };
  allErrors = allErrors.concat(errors);
  counts[level] = questions.length;
  fs.writeFileSync(path.join(OUT, `${level}.json`), JSON.stringify(questions, null, 0));
}
if (allErrors.length) {
  console.error(allErrors.join("\n"));
  process.exit(1);
}
console.log("content:", Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(" "), "total=" + Object.values(counts).reduce((a, b) => a + b, 0));
