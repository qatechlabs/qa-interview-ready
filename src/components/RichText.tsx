import { Fragment, type ReactNode } from "react";

/** Renders inline `code` and **bold** without HTML injection. */
export function Inline({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(<Fragment key={i++}>{text.slice(last, m.index)}</Fragment>);
    const tok = m[0];
    if (tok.startsWith("`")) parts.push(<code key={i++} className="inline-code">{tok.slice(1, -1)}</code>);
    else parts.push(<strong key={i++}>{tok.slice(2, -2)}</strong>);
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(<Fragment key={i++}>{text.slice(last)}</Fragment>);
  return <>{parts}</>;
}

type Seg = { kind: "p" | "ul" | "ol" | "table"; lines: string[] };

function segment(lines: string[]): Seg[] {
  const segs: Seg[] = [];
  for (const l of lines) {
    const kind: Seg["kind"] = l.startsWith("|") ? "table" : l.startsWith("- ") ? "ul" : /^\d+\.\s/.test(l) ? "ol" : "p";
    const last = segs[segs.length - 1];
    if (last && last.kind === kind) last.lines.push(l);
    else segs.push({ kind, lines: [l] });
  }
  return segs;
}

function Table({ lines }: { lines: string[] }) {
  const cells = (l: string) => l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  const [head, , ...rows] = lines;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>{cells(head).map((c, ci) => <th key={ci} className="border-b px-3 py-2 text-left font-semibold" style={{ borderColor: "var(--border)" }}><Inline text={c} /></th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>{cells(r).map((c, ci) => <td key={ci} className="border-b px-3 py-2 align-top" style={{ borderColor: "var(--border)" }}><Inline text={c} /></td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Paragraphs separated by blank lines; "- " bullets, "1. " numbered lists and | tables |. */
export function RichText({ text, className = "" }: { text: string; className?: string }) {
  const segs = text
    .trim()
    .split(/\n\s*\n/)
    .flatMap((block) => segment(block.split("\n").map((l) => l.trim()).filter(Boolean)));
  return (
    <div className={`space-y-3 ${className}`}>
      {segs.map((seg, i) => {
        if (seg.kind === "table" && seg.lines.length >= 2) return <Table key={i} lines={seg.lines} />;
        if (seg.kind === "ul")
          return <ul key={i} className="list-disc space-y-1 pl-5">{seg.lines.map((l, li) => <li key={li}><Inline text={l.slice(2)} /></li>)}</ul>;
        if (seg.kind === "ol")
          return <ol key={i} className="list-decimal space-y-1 pl-5">{seg.lines.map((l, li) => <li key={li}><Inline text={l.replace(/^\d+\.\s/, "")} /></li>)}</ol>;
        return <p key={i}><Inline text={seg.lines.join(" ")} /></p>;
      })}
    </div>
  );
}
