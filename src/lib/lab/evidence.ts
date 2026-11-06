/**
 * Evidence document: a Word (.docx) test execution report built in the browser from the same model
 * as the HTML report. Cover page, executive summary with KPIs, charts, environment, acceptance
 * checks, results table, failure analysis, step-by-step evidence with event-based screenshots and a
 * sign-off table. Styled with the QA Interview Ready palette (navy, burgundy, paper).
 */
import type { ReportModel, ReportTest } from "./report";
import { analyse, environmentRows, fmtMs, classifyStep } from "./analysis";
import { barChart, columnChart, donutChart, PAPER_PALETTE, svgToPng } from "./charts";

const PAGE_IMG_WIDTH = 600;
const NAVY = "0C1629";
const NAVY_LIGHT = "101C33";
const BURGUNDY = "74223A";
const PAPER = "EFE9E2";
const PAPER_LIGHT = "F7F3EE";
const INK = "101C33";
const MUTED = "5B6577";
const LINE = "D9D4CC";
const GREEN = "1F8A55";
const GREEN_BG = "DCF3E6";
const RED = "C0392B";
const RED_BG = "FBE0DC";
const AMBER = "9A7B00";
const AMBER_BG = "FBF1D0";
const BLUE = "2D6CDF";
const BLUE_BG = "E3ECFB";

function imageSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || 800, h: img.naturalHeight || 450 });
    img.onerror = () => resolve({ w: 800, h: 450 });
    img.src = dataUrl;
  });
}

export async function buildEvidenceDocx(m: ReportModel): Promise<Blob> {
  const docx = await import("docx");
  const { AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, ImageRun, Packer, PageBreak, PageNumber, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, VerticalAlignTable, WidthType, ExternalHyperlink, TabStopType } = docx;
  const a = analyse(m);
  const env = environmentRows(m);

  // ---- primitives -------------------------------------------------------------------------
  const thin = { style: BorderStyle.SINGLE, size: 4, color: LINE };
  const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const borders = { top: thin, bottom: thin, left: thin, right: thin };
  const noBorders = { top: none, bottom: none, left: none, right: none };
  type CellOpts = { bold?: boolean; fill?: string; color?: string; width?: number; size?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; border?: boolean; span?: number; italics?: boolean; mono?: boolean; vAlign?: (typeof VerticalAlignTable)[keyof typeof VerticalAlignTable] };
  const run = (text: string, o: CellOpts = {}) => new TextRun({ text, bold: o.bold, italics: o.italics, color: o.color ?? INK, size: o.size ?? 19, font: o.mono ? "Consolas" : undefined });
  const cell = (content: string | InstanceType<typeof Paragraph>[], o: CellOpts = {}) =>
    new TableCell({
      borders: o.border === false ? noBorders : borders,
      columnSpan: o.span,
      verticalAlign: o.vAlign,
      width: o.width ? { size: o.width, type: WidthType.PERCENTAGE } : undefined,
      shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: "auto" } : undefined,
      margins: { top: 70, bottom: 70, left: 100, right: 100 },
      children: typeof content === "string" ? [new Paragraph({ alignment: o.align, children: [run(content, o)] })] : content,
    });
  const headerCell = (text: string, width?: number, align?: CellOpts["align"]) => cell(text, { bold: true, fill: NAVY, color: PAPER, width, size: 17, align });
  const table = (rows: InstanceType<typeof TableRow>[], widths?: number[]) =>
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: widths?.map((w) => Math.round(w * 90)), rows });
  const row = (cells: InstanceType<typeof TableCell>[], header = false) => new TableRow({ tableHeader: header, cantSplit: true, children: cells });
  const kv = (rows: [string, string][]) => table(rows.map(([k, v], i) => row([cell(k, { bold: true, fill: i % 2 ? PAPER_LIGHT : PAPER, width: 30, color: INK }), isUrl(v) ? cell([linkPara(v, v)], { width: 70 }) : cell(v, { width: 70 })])));
  const isUrl = (v: string) => /^https?:\/\//.test(v);
  const linkPara = (text: string, url: string) => new Paragraph({ children: [new ExternalHyperlink({ link: url, children: [new TextRun({ text, style: "Hyperlink", size: 19 })] })] });
  const h1 = (text: string) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text })], spacing: { before: 360, after: 140 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BURGUNDY, space: 4 } } });
  const h2 = (text: string) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text })], spacing: { before: 240, after: 100 } });
  const p = (text: string, o: { italics?: boolean; color?: string; size?: number; bold?: boolean; after?: number; align?: CellOpts["align"] } = {}) =>
    new Paragraph({ alignment: o.align, children: [new TextRun({ text, italics: o.italics, bold: o.bold, color: o.color ?? INK, size: o.size ?? 20 })], spacing: { after: o.after ?? 100, line: 300 } });
  const statusCell = (status: string, width?: number) => {
    const s = status.toUpperCase();
    const good = s === "PASSED" || s === "PASS";
    const info = s === "INFO";
    return cell(s, { bold: true, width, align: AlignmentType.CENTER, color: good ? GREEN : info ? BLUE : RED, fill: good ? GREEN_BG : info ? BLUE_BG : RED_BG, size: 17 });
  };
  const image = async (dataUrl: string, maxWidth: number, type: "jpg" | "png", alt: string, name: string) => {
    const { w, h } = await imageSize(dataUrl);
    const width = Math.min(maxWidth, w);
    const height = Math.round((h / w) * width);
    return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new ImageRun({ type, data: dataUrl, transformation: { width, height }, altText: { title: alt, description: alt, name } })] });
  };
  const caption = (text: string) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text, italics: true, size: 17, color: MUTED })] });
  const shadedBox = (title: string, body: string, fill: string, color: string) =>
    table([row([cell([new Paragraph({ spacing: { after: 40 }, children: [run(title.toUpperCase(), { bold: true, color, size: 16 })] }), new Paragraph({ children: [run(body, { color: INK, size: 20 })] })], { fill, border: false })])]);

  // ---- charts (rasterised) --------------------------------------------------------------------
  const pal = PAPER_PALETTE;
  const charts: { png: string; w: number; h: number; caption: string }[] = [];
  const addChart = async (svg: string, w: number, h: number, cap: string) => {
    try {
      charts.push({ png: await svgToPng(svg, w, h, 2, "#ffffff"), w, h, caption: cap });
    } catch {
      /* chart skipped when the browser cannot rasterise it */
    }
  };
  await addChart(
    donutChart(
      [
        { label: "Passed", value: a.passed, color: pal.pass },
        { label: "Failed", value: a.failed, color: pal.fail },
      ],
      { title: "Test outcomes", centre: `${a.rate}%`, sub: "pass rate", palette: pal },
    ),
    420,
    200,
    "Figure A · Test outcomes",
  );
  await addChart(
    donutChart(
      [
        { label: "Navigation", value: a.byKind.navigation, color: pal.info },
        { label: "Actions", value: a.byKind.action, color: pal.accent },
        { label: "Assertions", value: a.byKind.assertion, color: pal.pass },
        { label: "Other", value: a.byKind.step + a.byKind.other, color: pal.muted },
      ],
      { title: "Steps by type", centre: String(a.stepsTotal), sub: "steps", palette: pal },
    ),
    420,
    200,
    "Figure B · Steps by type",
  );
  const stepsRows = a.rows.map((r) => ({ label: r.name, values: [r.steps - r.failedSteps, r.failedSteps], note: `${r.steps} step${r.steps === 1 ? "" : "s"}` }));
  await addChart(
    barChart(stepsRows, [{ name: "Passed steps", color: pal.pass }, { name: "Failed steps", color: pal.fail }], { title: "Steps per test", palette: pal, width: 640 }),
    640,
    (stepsRows.length ? 36 + stepsRows.length * 28 + 30 : 80),
    "Figure C · Steps per test (passed vs failed)",
  );
  const durations = a.rows.filter((r) => r.durationMs != null);
  if (durations.length)
    await addChart(
      columnChart(durations.map((r) => ({ label: r.name, value: r.durationMs ?? 0, color: r.status === "passed" ? pal.pass : pal.fail })), { title: "Duration per test", palette: pal, width: 640, format: (v) => fmtMs(v) }),
      640,
      240,
      "Figure D · Duration per test",
    );

  // ---- cover page -------------------------------------------------------------------------------
  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [];
  const verdictFill = m.verdict === "pass" ? GREEN : m.verdict === "fail" ? RED : BLUE;
  children.push(
    table([
      row([
        cell(
          [
            new Paragraph({ spacing: { before: 500, after: 80 }, children: [run("QA INTERVIEW READY  ·  QA TECH LABS", { color: "DBAD96", bold: true, size: 16 })] }),
            new Paragraph({ spacing: { after: 120 }, children: [run("Test Execution Report", { color: PAPER, bold: true, size: 52 })] }),
            new Paragraph({ spacing: { after: 60 }, children: [run(m.scenario, { color: PAPER, size: 30 })] }),
            new Paragraph({ spacing: { after: 500 }, children: [run(`Application under test: ${m.app}`, { color: "B9C0CE", size: 22 })] }),
          ],
          { fill: NAVY, border: false },
        ),
      ]),
      row([
        cell(
          [
            new Paragraph({ spacing: { before: 120, after: 40 }, children: [run(`RESULT: ${a.verdictLabel}`, { color: "FFFFFF", bold: true, size: 30 })] }),
            new Paragraph({ spacing: { after: 120 }, children: [run(a.verdictLong, { color: "FFFFFF", size: 20 })] }),
          ],
          { fill: verdictFill, border: false },
        ),
      ]),
    ]),
  );
  children.push(p("", { after: 240 }));
  children.push(
    kv([
      ["Prepared for", "Delivery Manager · Product Owner"],
      ["Prepared by", m.learner ?? "Test engineer"],
      ["Executed on", m.mode === "github" ? "GitHub Actions (real Playwright, Chromium)" : "In-browser Playwright runtime"],
      ["Run date", new Date(m.startedAt).toLocaleString()],
      ["Pass rate", `${a.rate}% (${a.passed} of ${a.total} tests)`],
      ["Release risk", a.risk.toUpperCase()],
      ["Document version", `1.0 · generated ${new Date().toLocaleDateString()}`],
    ]),
  );
  children.push(p("", { after: 200 }));
  children.push(p("Contents", { bold: true, size: 22, after: 60 }));
  ["1. Executive summary", "2. Results at a glance", "3. Environment and run details", "4. Scenario acceptance checks", "5. Test results", "6. Failure analysis", "7. Step-by-step evidence", "8. Sign-off"].forEach((t) => children.push(p(t, { size: 19, after: 20, color: MUTED })));
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ---- 1. executive summary -----------------------------------------------------------------------
  children.push(h1("1. Executive summary"));
  children.push(p(a.summary, { size: 21, after: 160 }));
  const kpis: [string, string, string][] = [
    ["Pass rate", `${a.rate}%`, a.failed ? RED : GREEN],
    ["Tests", String(a.total), INK],
    ["Passed", String(a.passed), GREEN],
    ["Failed", String(a.failed), a.failed ? RED : INK],
    ["Assertions", `${a.assertionsPassed}${a.assertionsFailed ? ` / ${a.assertionsFailed} failed` : ""}`, INK],
    ["Steps", String(a.stepsTotal), INK],
    ["Evidence screenshots", String(a.screenshots), INK],
    ["Duration", fmtMs(m.durationMs) || "n/a", INK],
  ];
  const kpiCell = ([label, value, color]: [string, string, string]) =>
    cell([new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [run(value, { bold: true, size: 34, color })] }), new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [run(label.toUpperCase(), { size: 14, color: MUTED })] })], { fill: PAPER_LIGHT, width: 25 });
  children.push(table([row(kpis.slice(0, 4).map(kpiCell)), row(kpis.slice(4).map(kpiCell))]));
  children.push(p("", { after: 120 }));
  children.push(shadedBox("Recommendation", a.recommendation, a.risk === "low" ? GREEN_BG : a.risk === "medium" ? AMBER_BG : RED_BG, a.risk === "low" ? GREEN : a.risk === "medium" ? AMBER : RED));
  if (a.failures.length) {
    children.push(p("", { after: 80 }));
    children.push(p(`Failed tests: ${a.failures.map((f) => `${f.test}${f.step ? ` (step ${f.stepIndex})` : ""}`).join("; ")}.`, { color: RED, size: 19 }));
  }
  if (a.slowest) children.push(p(`Slowest test: ${a.slowest.name} (${fmtMs(a.slowest.durationMs)}).`, { color: MUTED, size: 18 }));

  // ---- 2. charts ---------------------------------------------------------------------------------
  children.push(h1("2. Results at a glance"));
  if (charts.length >= 2) {
    const [c1, c2, ...rest] = charts;
    const chartCell = async (c: (typeof charts)[number]) => cell([await image(c.png, 300, "png", c.caption, c.caption.replace(/\W+/g, "-")), caption(c.caption)], { border: false, width: 50 });
    children.push(table([row([await chartCell(c1), await chartCell(c2)])]));
    for (const c of rest) {
      children.push(await image(c.png, PAGE_IMG_WIDTH, "png", c.caption, c.caption.replace(/\W+/g, "-")));
      children.push(caption(c.caption));
    }
  } else children.push(p("Charts could not be rendered in this browser.", { italics: true, color: MUTED }));
  if (a.suites.length > 1) {
    children.push(h2("Results by suite"));
    children.push(
      table([
        row([headerCell("Suite", 52), headerCell("Tests", 12, AlignmentType.CENTER), headerCell("Passed", 12, AlignmentType.CENTER), headerCell("Failed", 12, AlignmentType.CENTER), headerCell("Duration", 12, AlignmentType.CENTER)], true),
        ...a.suites.map((s, i) => row([cell(s.name, { fill: i % 2 ? PAPER_LIGHT : undefined }), cell(String(s.passed + s.failed), { align: AlignmentType.CENTER }), cell(String(s.passed), { align: AlignmentType.CENTER, color: GREEN, bold: true }), cell(String(s.failed), { align: AlignmentType.CENTER, color: s.failed ? RED : INK, bold: !!s.failed }), cell(fmtMs(s.durationMs) || "–", { align: AlignmentType.CENTER })])),
      ]),
    );
  }

  // ---- 3. environment ------------------------------------------------------------------------------
  children.push(h1("3. Environment and run details"));
  children.push(kv(env));

  // ---- 4. acceptance checks ---------------------------------------------------------------------------
  children.push(h1("4. Scenario acceptance checks"));
  if (m.checks.length) {
    children.push(p(`${a.checksPassed} of ${m.checks.length} acceptance checks passed.`, { color: a.checksFailed ? RED : GREEN, bold: true }));
    children.push(table([row([headerCell("#", 6, AlignmentType.CENTER), headerCell("Acceptance check", 78), headerCell("Result", 16, AlignmentType.CENTER)], true), ...m.checks.map((c, i) => row([cell(String(i + 1), { align: AlignmentType.CENTER }), cell(c.label), statusCell(c.ok ? "PASS" : "FAIL")]))]));
  } else children.push(p("No scenario checks were evaluated for this run.", { italics: true, color: MUTED }));

  // ---- 5. test results -----------------------------------------------------------------------------------
  children.push(h1("5. Test results"));
  children.push(
    table([
      row([headerCell("#", 5, AlignmentType.CENTER), headerCell("Suite", 20), headerCell("Test case", 35), headerCell("Status", 12, AlignmentType.CENTER), headerCell("Steps", 8, AlignmentType.CENTER), headerCell("Asserts", 8, AlignmentType.CENTER), headerCell("Duration", 12, AlignmentType.CENTER)], true),
      ...a.rows.map((r, i) =>
        row([
          cell(String(r.index), { align: AlignmentType.CENTER, fill: i % 2 ? PAPER_LIGHT : undefined }),
          cell(r.suite, { color: MUTED, fill: i % 2 ? PAPER_LIGHT : undefined }),
          cell(r.error ? [new Paragraph({ children: [run(r.name)] }), new Paragraph({ children: [run(r.error.split("\n")[0].slice(0, 160), { color: RED, size: 16, mono: true })] })] : r.name, { fill: i % 2 ? PAPER_LIGHT : undefined }),
          statusCell(r.status),
          cell(`${r.steps}${r.failedSteps ? ` (${r.failedSteps} ✗)` : ""}`, { align: AlignmentType.CENTER, fill: i % 2 ? PAPER_LIGHT : undefined }),
          cell(String(r.assertions), { align: AlignmentType.CENTER, fill: i % 2 ? PAPER_LIGHT : undefined }),
          cell(fmtMs(r.durationMs) || "–", { align: AlignmentType.CENTER, fill: i % 2 ? PAPER_LIGHT : undefined }),
        ]),
      ),
    ]),
  );

  // ---- 6. failure analysis --------------------------------------------------------------------------------
  children.push(h1("6. Failure analysis"));
  if (!a.failures.length) children.push(shadedBox("No failures", "Every test and step completed as expected. No defects were observed during this run.", GREEN_BG, GREEN));
  for (const f of a.failures) {
    children.push(h2(`${f.testIndex}. ${f.test}`));
    children.push(
      kv([
        ["Suite", f.suite],
        ["Failing step", f.step ? `Step ${f.stepIndex}: ${f.step}` : "Not attributable to a single step"],
        ["Error", f.error],
        ["Impact", "The acceptance criteria covered by this test are not met; the scenario cannot be signed off until it passes."],
        ["Next action", "Triage: confirm whether the failure is an application defect, a test defect or an environment issue; fix and re-run."],
      ]),
    );
    if (f.screenshot) {
      children.push(p("", { after: 60 }));
      children.push(await image(f.screenshot, PAGE_IMG_WIDTH, "jpg", `Application state at the failure of ${f.test}`, `fail-${f.testIndex}`));
      children.push(caption(`Application state at the failure of "${f.test}"`));
    }
  }

  // ---- 7. step-by-step evidence --------------------------------------------------------------------------
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(h1("7. Step-by-step evidence"));
  children.push(p("Each step is listed in execution order with its type, result and timing. Screenshots were captured by the test runner immediately after the step completed.", { color: MUTED, size: 18 }));
  let shotNo = 0;
  for (let i = 0; i < m.tests.length; i++) {
    const t: ReportTest = m.tests[i];
    const { suite, name } = (() => {
      const k = t.name.lastIndexOf(" › ");
      return k > 0 ? { suite: t.name.slice(0, k), name: t.name.slice(k + 3) } : { suite: "", name: t.name };
    })();
    children.push(h2(`7.${i + 1} ${name}`));
    children.push(table([row([cell(`${suite ? suite + "  ·  " : ""}${t.steps.length} steps  ·  ${fmtMs(t.durationMs) || "–"}`, { color: MUTED, size: 17, border: false, width: 80 }), statusCell(t.status, 20)])]));
    if (t.error) children.push(p(t.error, { color: RED, size: 17 }));
    children.push(p("", { after: 40 }));
    const figOf: number[] = [];
    let local = shotNo;
    t.steps.forEach((s) => figOf.push(s.screenshot ? ++local : 0));
    children.push(
      table([
        row([headerCell("#", 6, AlignmentType.CENTER), headerCell("Type", 12), headerCell("Step", 50), headerCell("Status", 12, AlignmentType.CENTER), headerCell("Time", 10, AlignmentType.CENTER), headerCell("Evidence", 10, AlignmentType.CENTER)], true),
        ...t.steps.map((s, j) =>
          row([
            cell(String(j + 1), { align: AlignmentType.CENTER, fill: j % 2 ? PAPER_LIGHT : undefined }),
            cell(classifyStep(s.title), { color: MUTED, size: 16, fill: j % 2 ? PAPER_LIGHT : undefined }),
            cell(s.error ? [new Paragraph({ children: [run(s.title, { mono: true, size: 17 })] }), new Paragraph({ children: [run(s.error, { color: RED, size: 16, mono: true })] })] : [new Paragraph({ children: [run(s.title, { mono: true, size: 17 })] })], { fill: j % 2 ? PAPER_LIGHT : undefined }),
            statusCell(s.status),
            cell(fmtMs(s.durationMs) || "–", { align: AlignmentType.CENTER, fill: j % 2 ? PAPER_LIGHT : undefined }),
            cell(figOf[j] ? `Fig. ${figOf[j]}` : "–", { align: AlignmentType.CENTER, fill: j % 2 ? PAPER_LIGHT : undefined }),
          ]),
        ),
      ]),
    );
    for (let j = 0; j < t.steps.length; j++) {
      const s = t.steps[j];
      if (!s.screenshot) continue;
      shotNo++;
      children.push(new Paragraph({ spacing: { before: 200, after: 60 }, keepNext: true, children: [run(`Fig. ${shotNo}  ·  Step ${j + 1}: ${s.title}`, { bold: true, size: 18, color: BURGUNDY })] }));
      children.push(await image(s.screenshot, PAGE_IMG_WIDTH, "jpg", `Screenshot after step ${j + 1}: ${s.title}`, `fig-${shotNo}`));
      children.push(caption(`${s.status === "failed" ? "FAILED · " : ""}captured after "${s.title}"${s.durationMs ? ` · ${fmtMs(s.durationMs)}` : ""}`));
    }
    if (i < m.tests.length - 1) children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // ---- 8. sign-off ------------------------------------------------------------------------------------------
  children.push(h1("8. Sign-off"));
  children.push(p("This report is the record of one automated execution. Sign-off confirms that the results and evidence above have been reviewed.", { color: MUTED, size: 18 }));
  const blank = (w: number) => cell([new Paragraph({ spacing: { before: 200, after: 200 }, children: [run("")] })], { width: w });
  children.push(
    table([
      row([headerCell("Role", 22), headerCell("Name", 24), headerCell("Decision", 20), headerCell("Date", 14), headerCell("Signature", 20)], true),
      row([cell("Test engineer", { vAlign: VerticalAlignTable.CENTER }), cell(m.learner ?? "", { vAlign: VerticalAlignTable.CENTER }), cell(a.risk === "low" ? "Recommend sign-off" : "Hold", { vAlign: VerticalAlignTable.CENTER, color: a.risk === "low" ? GREEN : RED, bold: true }), cell(new Date().toLocaleDateString(), { vAlign: VerticalAlignTable.CENTER }), blank(20)]),
      row([cell("Delivery manager", { vAlign: VerticalAlignTable.CENTER }), blank(24), blank(20), blank(14), blank(20)]),
      row([cell("Product owner", { vAlign: VerticalAlignTable.CENTER }), blank(24), blank(20), blank(14), blank(20)]),
    ]),
  );
  children.push(p("", { after: 200 }));
  children.push(p(`Generated by QA Interview Ready labs on ${new Date().toLocaleString()}. Scenario ${m.scenarioId}.`, { italics: true, size: 16, color: MUTED }));

  const doc = new Document({
    creator: "QA Interview Ready",
    title: `${m.scenario} – test execution report`,
    description: "Test execution report with event-based screenshot evidence",
    styles: {
      default: { document: { run: { font: "Calibri", size: 20, color: INK } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 32, bold: true, color: NAVY_LIGHT, font: "Calibri" }, paragraph: { spacing: { before: 360, after: 140 }, keepNext: true } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 24, bold: true, color: BURGUNDY, font: "Calibri" }, paragraph: { spacing: { before: 240, after: 100 }, keepNext: true } },
      ],
    },
    sections: [
      {
        properties: { page: { margin: { top: 1100, bottom: 1000, left: 1000, right: 1000 } } },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                tabStops: [{ type: TabStopType.RIGHT, position: 9600 }],
                border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 4 } },
                children: [new TextRun({ text: "QA Interview Ready  ·  Test execution report", size: 16, color: MUTED }), new TextRun({ text: `\t${m.scenario}`, size: 16, color: MUTED })],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                tabStops: [{ type: TabStopType.RIGHT, position: 9600 }],
                children: [new TextRun({ text: `${m.app}  ·  ${new Date(m.startedAt).toLocaleDateString()}  ·  ${a.verdictLabel}`, size: 16, color: MUTED }), new TextRun({ children: ["\tPage ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], size: 16, color: MUTED })],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
  return Packer.toBlob(doc);
}

export function evidenceFileName(m: ReportModel) {
  const d = new Date(m.startedAt);
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
  return `test-report-${m.scenarioId}-${stamp}.docx`;
}
