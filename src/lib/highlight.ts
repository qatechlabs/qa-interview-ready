import "server-only";
import { createHighlighter, type Highlighter } from "shiki";
import type { CodeSample } from "@/content/types";

const LANGS = ["java", "typescript", "python", "sql", "bash", "yaml", "javascript", "json", "gherkin", "groovy", "xml"] as const;

let highlighter: Promise<Highlighter> | null = null;
function getHighlighter() {
  if (!highlighter) {
    highlighter = createHighlighter({ themes: ["github-light", "github-dark"], langs: [...LANGS] });
  }
  return highlighter;
}

export async function highlight(sample: CodeSample) {
  const h = await getHighlighter();
  const lang = (LANGS as readonly string[]).includes(sample.lang) ? sample.lang : "text";
  return h.codeToHtml(sample.code.replace(/^\n+|\s+$/g, ""), {
    lang,
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
  });
}

export async function highlightAll(samples: CodeSample[] = []) {
  return Promise.all(samples.map(async (s) => ({ ...s, html: await highlight(s) })));
}
