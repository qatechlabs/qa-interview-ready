/**
 * Screenshots of the practice-app iframe for run evidence. The iframe is same-origin, so the
 * document is cloned (with live form values), serialised into an SVG foreignObject and painted
 * on a canvas. Runs entirely in the learner's browser; no network, no dependencies.
 */

const MAX_WIDTH = 960;

/**
 * Serialises the frame's DOM a few milliseconds after the step completed (the runtime pauses 30ms
 * between steps, and the practice apps re-render right after an event), then rasterises it.
 * Returns a JPEG data URL.
 */
export async function snapshotFrame(frame: HTMLIFrameElement, quality = 0.72, settleMs = 15): Promise<string | null> {
  if (settleMs > 0) await new Promise((r) => setTimeout(r, settleMs));
  let svg: string;
  let w: number;
  let h: number;
  try {
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc?.documentElement || !win) return null;
    w = frame.clientWidth || 800;
    h = frame.clientHeight || 420;
    const clone = doc.documentElement.cloneNode(true) as HTMLElement;
    copyFormState(doc, clone);
    clone.querySelectorAll("script, link[rel=stylesheet], iframe, video, audio, object, embed").forEach((e) => e.remove());
    const style = doc.createElement("style");
    style.textContent = `html{overflow:hidden !important;background:#fff}body{position:relative;top:${-(win.scrollY || 0)}px;left:${-(win.scrollX || 0)}px}`;
    (clone.querySelector("head") || clone).appendChild(style);
    clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
    const xhtml = new XMLSerializer().serializeToString(clone);
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject width="100%" height="100%">${xhtml}</foreignObject></svg>`;
  } catch {
    return null;
  }
  return new Promise((resolve) => {
    const img = new Image();
    const done = (v: string | null) => resolve(v);
    img.onload = () => {
      try {
        const scale = Math.min(1, MAX_WIDTH / w);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return done(null);
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        done(canvas.toDataURL("image/jpeg", quality));
      } catch {
        done(null);
      }
    };
    img.onerror = () => done(null);
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  });
}

function copyFormState(doc: Document, clone: HTMLElement) {
  // instanceof doesn't work across the iframe boundary (different realm), so go by tag name
  const src = doc.querySelectorAll<HTMLElement>("input, textarea, select");
  const dst = clone.querySelectorAll<HTMLElement>("input, textarea, select");
  src.forEach((el, i) => {
    const d = dst[i];
    if (!d) return;
    const tag = el.tagName.toLowerCase();
    if (tag === "input") {
      const input = el as HTMLInputElement;
      if (input.type === "checkbox" || input.type === "radio") {
        if (input.checked) d.setAttribute("checked", "");
        else d.removeAttribute("checked");
      } else if (input.type === "password") {
        // the SVG renderer ignores password values; draw the mask the learner saw instead
        d.setAttribute("type", "text");
        d.setAttribute("value", "•".repeat(input.value.length));
      } else if (input.type !== "file") {
        d.setAttribute("value", input.value);
      }
    } else if (tag === "textarea") {
      d.textContent = (el as HTMLTextAreaElement).value;
    } else if (tag === "select") {
      const sel = el as HTMLSelectElement;
      d.querySelectorAll("option").forEach((o, j) => {
        if (j === sel.selectedIndex) o.setAttribute("selected", "");
        else o.removeAttribute("selected");
      });
    }
  });
}
