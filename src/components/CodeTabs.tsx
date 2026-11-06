"use client";
import { useState } from "react";
import { CopyButton } from "./CopyButton";

export interface RenderedCode {
  lang: string;
  label?: string;
  code: string;
  html: string;
}

const LANG_NAMES: Record<string, string> = {
  java: "Java", typescript: "TypeScript", python: "Python", sql: "SQL", bash: "Shell", yaml: "YAML",
  javascript: "JavaScript", json: "JSON", gherkin: "Gherkin", groovy: "Groovy", xml: "XML", text: "Text",
};

export function CodeTabs({ samples }: { samples: RenderedCode[] }) {
  const [i, setI] = useState(0);
  if (!samples.length) return null;
  const cur = samples[Math.min(i, samples.length - 1)];
  return (
    <div className="code-block overflow-hidden rounded-xl border" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center gap-1 border-b px-2 py-1.5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        {samples.map((s, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            className="rounded px-2 py-0.5 text-xs font-medium"
            style={idx === i ? { background: "var(--accent-soft)", color: "var(--accent)" } : { color: "var(--muted)" }}
          >
            {s.label || LANG_NAMES[s.lang] || s.lang}
          </button>
        ))}
        <span className="ml-auto"><CopyButton text={cur.code.trim()} /></span>
      </div>
      <div dangerouslySetInnerHTML={{ __html: cur.html }} />
    </div>
  );
}
