/**
 * Evidence document: a Word (.docx) file with the run summary, every step and the event-based
 * screenshots, built in the browser from the same model as the HTML report.
 */
import type { ReportModel, ReportTest } from "./report";

const PAGE_IMG_WIDTH = 600;

function imageSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || 800, h: img.naturalHeight || 450 });
    img.onerror = () => resolve({ w: 800, h: 450 });
    img.src = dataUrl;
  });
}

const fmtMs = (ms?: number) => (ms == null ? "" : ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`);

export async function buildEvidenceDocx(m: ReportModel): Promise<Blob> {
  const docx = await import("docx");
  const { AlignmentType, BorderStyle, Document, HeadingLevel, ImageRun, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType, ExternalHyperlink, PageBreak } = docx;
  const total = m.tests.length;
  const passed = m.tests.filter((t) => t.status === "passed").length;
  const border = { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const cell = (text: string, opts: { bold?: boolean; fill?: string; color?: string; width?: number } = {}) =>
    new TableCell({
      borders,
      width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
      shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill, color: "auto" } : undefined,
      children: [new Paragraph({ children: [new TextRun({ text, bold: opts.bold, color: opts.color, size: 20 })] })],
    });
  const kv = (rows: [string, string][]) =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: rows.map(([k, v]) => new TableRow({ children: [cell(k, { bold: true, fill: "F3F4F6", width: 28 }), cell(v, { width: 72 })] })),
    });
  const statusColor = (s: string) => (s === "passed" ? "166534" : s === "failed" ? "991B1B" : "1F2937");
  const h = (text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]) => new Paragraph({ heading: level, children: [new TextRun(text)], spacing: { before: 240, after: 120 } });
  const p = (text: string, opts: { italics?: boolean; color?: string; size?: number } = {}) => new Paragraph({ children: [new TextRun({ text, ...opts, size: opts.size ?? 20 })], spacing: { after: 80 } });
  const link = (text: string, url: string) => new Paragraph({ children: [new ExternalHyperlink({ link: url, children: [new TextRun({ text, style: "Hyperlink" })] })], spacing: { after: 80 } });

  const children: InstanceType<typeof Paragraph | typeof Table>[] = [];
  children.push(new Paragraph({ children: [new TextRun({ text: "Test Execution Evidence", bold: true, size: 44 })], spacing: { after: 60 } }));
  children.push(p(`${m.scenario} · ${m.app}`, { color: "4B5563", size: 24 }));
  children.push(p(`Result: ${m.verdict === "pass" ? "SCENARIO PASSED" : m.verdict === "fail" ? "NOT YET (see failed checks)" : "RUN FINISHED"}`, { color: m.verdict === "pass" ? "166534" : "991B1B" }));
  children.push(h("1. Run details", HeadingLevel.HEADING_1));
  children.push(
    kv([
      ["Scenario", m.scenario],
      ["Application", m.app],
      ["Executed on", m.mode === "github" ? "GitHub Actions (real Playwright, Chromium)" : "In-browser Playwright runtime"],
      ["Started", new Date(m.startedAt).toLocaleString()],
      ["Duration", fmtMs(m.durationMs)],
      ["Tests", `${passed} passed, ${total - passed} failed, ${total} total`],
      ["Assertions", m.assertions.passed < 0 ? "not reported" : `${m.assertions.passed} passed, ${m.assertions.failed} failed`],
      ...(m.learner ? [["Learner", m.learner] as [string, string]] : []),
      ...(m.baseURL ? [["Base URL", m.baseURL] as [string, string]] : []),
    ]),
  );
  if (m.runUrl) children.push(link("GitHub Actions run", m.runUrl));
  if (m.commitUrl) children.push(link("Commit with the code that ran", m.commitUrl));

  children.push(h("2. Scenario checks", HeadingLevel.HEADING_1));
  if (m.checks.length)
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ tableHeader: true, children: [cell("Check", { bold: true, fill: "E5E7EB", width: 80 }), cell("Result", { bold: true, fill: "E5E7EB", width: 20 })] }),
          ...m.checks.map((c) => new TableRow({ children: [cell(c.label), cell(c.ok ? "PASS" : "FAIL", { bold: true, color: c.ok ? "166534" : "991B1B" })] })),
        ],
      }),
    );
  else children.push(p("No scenario checks were evaluated.", { italics: true }));

  children.push(h("3. Test results", HeadingLevel.HEADING_1));
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ tableHeader: true, children: [cell("#", { bold: true, fill: "E5E7EB", width: 6 }), cell("Test", { bold: true, fill: "E5E7EB", width: 64 }), cell("Status", { bold: true, fill: "E5E7EB", width: 15 }), cell("Duration", { bold: true, fill: "E5E7EB", width: 15 })] }),
        ...m.tests.map((t, i) => new TableRow({ children: [cell(String(i + 1)), cell(t.name), cell(t.status.toUpperCase(), { bold: true, color: statusColor(t.status) }), cell(fmtMs(t.durationMs))] })),
      ],
    }),
  );

  children.push(h("4. Step-by-step evidence", HeadingLevel.HEADING_1));
  let shotNo = 0;
  for (let i = 0; i < m.tests.length; i++) {
    const t: ReportTest = m.tests[i];
    children.push(h(`4.${i + 1} ${t.name} — ${t.status.toUpperCase()}`, HeadingLevel.HEADING_2));
    if (t.error) children.push(p(t.error, { color: "991B1B" }));
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ tableHeader: true, children: [cell("Step", { bold: true, fill: "E5E7EB", width: 8 }), cell("Action / assertion", { bold: true, fill: "E5E7EB", width: 62 }), cell("Status", { bold: true, fill: "E5E7EB", width: 15 }), cell("Evidence", { bold: true, fill: "E5E7EB", width: 15 })] }),
          ...t.steps.map((s, j) => new TableRow({ children: [cell(String(j + 1)), cell(s.title), cell(s.status.toUpperCase(), { bold: true, color: statusColor(s.status) }), cell(s.screenshot ? `Fig. ${shotNo + t.steps.slice(0, j + 1).filter((x) => x.screenshot).length}` : "")] })),
        ],
      }),
    );
    for (let j = 0; j < t.steps.length; j++) {
      const s = t.steps[j];
      if (!s.screenshot) continue;
      shotNo++;
      const { w, h: ih } = await imageSize(s.screenshot);
      const width = Math.min(PAGE_IMG_WIDTH, w);
      const height = Math.round((ih / w) * width);
      children.push(new Paragraph({ spacing: { before: 160, after: 40 }, children: [new TextRun({ text: `Fig. ${shotNo} · Step ${j + 1}: ${s.title}`, bold: true, size: 18, color: "374151" })] }));
      if (s.error) children.push(p(s.error, { color: "991B1B", size: 18 }));
      children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: "jpg", data: s.screenshot, transformation: { width, height }, altText: { title: s.title, description: `Screenshot after ${s.title}`, name: `fig-${shotNo}` } })] }));
    }
    if (i < m.tests.length - 1) children.push(new Paragraph({ children: [new PageBreak()] }));
  }
  children.push(new Paragraph({ spacing: { before: 300 }, children: [new TextRun({ text: `Generated by QA Interview Ready labs on ${new Date().toLocaleString()}.`, italics: true, size: 18, color: "6B7280" })] }));

  const doc = new Document({
    creator: "QA Interview Ready",
    title: `${m.scenario} – test execution evidence`,
    description: "Event-based screenshots and results of one lab run",
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } }, children }],
  });
  return Packer.toBlob(doc);
}

export function evidenceFileName(m: ReportModel) {
  const d = new Date(m.startedAt);
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
  return `evidence-${m.scenarioId}-${stamp}.docx`;
}
