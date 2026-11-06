/**
 * Dependency-free SVG charts shared by the HTML run report (inline) and the Word evidence document
 * (rasterised to PNG in the browser). Colours come from a palette so the same chart renders on the
 * dark report page and on white paper.
 */

export interface ChartPalette {
  pass: string;
  fail: string;
  info: string;
  track: string;
  ink: string;
  muted: string;
  accent: string;
}

export const DARK_PALETTE: ChartPalette = { pass: "#7fd3a4", fail: "#f09a93", info: "#93c5fd", track: "#1e2f50", ink: "#efe9e2", muted: "#b9c0ce", accent: "#dbad96" };
export const PAPER_PALETTE: ChartPalette = { pass: "#1f8a55", fail: "#c0392b", info: "#2d6cdf", track: "#e6e1da", ink: "#101c33", muted: "#5b6577", accent: "#74223a" };

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const FONT = "font-family='system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif'";

export interface Segment {
  label: string;
  value: number;
  color: string;
}

/** Donut (pie) chart with a centre label and a legend on the right. */
export function donutChart(segments: Segment[], opts: { title?: string; centre?: string; sub?: string; palette?: ChartPalette; width?: number } = {}): string {
  const pal = opts.palette ?? DARK_PALETTE;
  const W = opts.width ?? 420;
  const H = 200;
  const cx = 100;
  const cy = 100;
  const r = 68;
  const stroke = 24;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((a, s) => a + s.value, 0);
  let offset = 0;
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const len = (s.value / total) * c;
      const el = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${stroke}" stroke-dasharray="${len.toFixed(2)} ${(c - len).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"><title>${esc(s.label)}: ${s.value}</title></circle>`;
      offset += len;
      return el;
    })
    .join("");
  const legend = segments
    .map((s, i) => {
      const pct = total ? Math.round((s.value / total) * 100) : 0;
      const y = 48 + i * 30;
      return `<rect x="215" y="${y - 10}" width="14" height="14" rx="3" fill="${s.color}"/><text x="238" y="${y + 2}" font-size="14" fill="${pal.ink}" ${FONT}>${esc(s.label)}</text><text x="${W - 12}" y="${y + 2}" font-size="14" text-anchor="end" fill="${pal.muted}" ${FONT}>${s.value} · ${pct}%</text>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(opts.title ?? "Pie chart")}">
${opts.title ? `<text x="12" y="22" font-size="13" font-weight="700" fill="${pal.muted}" ${FONT} letter-spacing="1" style="text-transform:uppercase">${esc(opts.title.toUpperCase())}</text>` : ""}
<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${pal.track}" stroke-width="${stroke}"/>${arcs}
<text x="${cx}" y="${cy + (opts.sub ? 2 : 8)}" text-anchor="middle" font-size="26" font-weight="800" fill="${pal.ink}" ${FONT}>${esc(opts.centre ?? (total ? `${Math.round(((segments[0]?.value ?? 0) / total) * 100)}%` : "–"))}</text>
${opts.sub ? `<text x="${cx}" y="${cy + 22}" text-anchor="middle" font-size="11" fill="${pal.muted}" ${FONT}>${esc(opts.sub)}</text>` : ""}
${legend}</svg>`;
}

export interface BarRow {
  label: string;
  /** one value per series, in series order */
  values: number[];
  note?: string;
}

/** Horizontal (stacked) bar chart, one row per label, with the series in a legend. */
export function barChart(rows: BarRow[], series: { name: string; color: string }[], opts: { title?: string; palette?: ChartPalette; width?: number; format?: (v: number) => string; maxLabel?: number } = {}): string {
  const pal = opts.palette ?? DARK_PALETTE;
  const W = opts.width ?? 640;
  const rowH = 28;
  const top = opts.title ? 36 : 12;
  const labelW = Math.min(W * 0.42, 280);
  const left = labelW + 12;
  const right = 96;
  const H = top + rows.length * rowH + 30;
  const max = Math.max(1, ...rows.map((r) => r.values.reduce((a, b) => a + b, 0)));
  const fmt = opts.format ?? ((v: number) => String(v));
  const maxLabel = opts.maxLabel ?? 38;
  const trunc = (s: string) => (s.length > maxLabel ? s.slice(0, maxLabel - 1) + "…" : s);
  const bars = rows
    .map((r, i) => {
      const y = top + i * rowH;
      let x = left;
      const total = r.values.reduce((a, b) => a + b, 0);
      const segs = r.values
        .map((v, k) => {
          const w = ((W - left - right) * v) / max;
          const el = v > 0 ? `<rect x="${x.toFixed(1)}" y="${y + 6}" width="${Math.max(w, 1.5).toFixed(1)}" height="${rowH - 12}" rx="3" fill="${series[k]?.color ?? pal.info}"><title>${esc(r.label)} · ${esc(series[k]?.name ?? "")}: ${esc(fmt(v))}</title></rect>` : "";
          x += w;
          return el;
        })
        .join("");
      return `<text x="${left - 10}" y="${y + rowH / 2 + 4}" text-anchor="end" font-size="12" fill="${pal.ink}" ${FONT}><title>${esc(r.label)}</title>${esc(trunc(r.label))}</text>
<rect x="${left}" y="${y + 6}" width="${W - left - right}" height="${rowH - 12}" rx="3" fill="${pal.track}"/>${segs}
<text x="${(x + 8).toFixed(1)}" y="${y + rowH / 2 + 4}" font-size="12" fill="${pal.muted}" ${FONT}>${esc(r.note ?? fmt(total))}</text>`;
    })
    .join("\n");
  const legend = series
    .map((s, i) => `<rect x="${left + i * 120}" y="${H - 18}" width="12" height="12" rx="3" fill="${s.color}"/><text x="${left + i * 120 + 17}" y="${H - 8}" font-size="12" fill="${pal.muted}" ${FONT}>${esc(s.name)}</text>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(opts.title ?? "Bar chart")}">
${opts.title ? `<text x="12" y="22" font-size="13" font-weight="700" fill="${pal.muted}" ${FONT} letter-spacing="1">${esc(opts.title.toUpperCase())}</text>` : ""}
${bars}
${legend}</svg>`;
}

/** Vertical column chart (one series), used for durations per test. */
export function columnChart(items: { label: string; value: number; color?: string }[], opts: { title?: string; palette?: ChartPalette; width?: number; format?: (v: number) => string } = {}): string {
  const pal = opts.palette ?? DARK_PALETTE;
  const W = opts.width ?? 640;
  const H = 240;
  const top = opts.title ? 40 : 16;
  const bottom = 56;
  const left = 44;
  const n = Math.max(1, items.length);
  const gap = 10;
  const bw = Math.max(8, Math.min(64, (W - left - 16 - gap * n) / n));
  const max = Math.max(1, ...items.map((i) => i.value));
  const fmt = opts.format ?? ((v: number) => String(v));
  const scaleH = H - top - bottom;
  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((f) => {
      const y = top + scaleH - scaleH * f;
      return `<line x1="${left}" y1="${y}" x2="${W - 12}" y2="${y}" stroke="${pal.track}" stroke-width="1"/><text x="${left - 6}" y="${y + 4}" text-anchor="end" font-size="10" fill="${pal.muted}" ${FONT}>${esc(fmt(max * f))}</text>`;
    })
    .join("");
  const cols = items
    .map((it, i) => {
      const h = (scaleH * it.value) / max;
      const x = left + 8 + i * (bw + gap);
      const y = top + scaleH - h;
      const label = it.label.length > 14 ? it.label.slice(0, 13) + "…" : it.label;
      return `<rect x="${x}" y="${y.toFixed(1)}" width="${bw}" height="${Math.max(h, 1).toFixed(1)}" rx="3" fill="${it.color ?? pal.accent}"><title>${esc(it.label)}: ${esc(fmt(it.value))}</title></rect>
<text x="${x + bw / 2}" y="${y - 4}" text-anchor="middle" font-size="10" fill="${pal.ink}" ${FONT}>${esc(fmt(it.value))}</text>
<text x="${x + bw / 2}" y="${top + scaleH + 14}" text-anchor="middle" font-size="10" fill="${pal.muted}" ${FONT} transform="rotate(-18 ${x + bw / 2} ${top + scaleH + 14})">${esc(label)}</text>`;
    })
    .join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(opts.title ?? "Column chart")}">
${opts.title ? `<text x="12" y="22" font-size="13" font-weight="700" fill="${pal.muted}" ${FONT} letter-spacing="1">${esc(opts.title.toUpperCase())}</text>` : ""}
${grid}
${cols}</svg>`;
}

/** Rasterises an SVG string to a PNG data URL (browser only), at 2x for crisp print. */
export function svgToPng(svg: string, width: number, height: number, scale = 2, background = "#ffffff"): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no canvas");
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("svg render failed"));
    };
    img.src = url;
  });
}
