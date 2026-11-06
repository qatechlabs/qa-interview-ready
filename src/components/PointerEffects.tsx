"use client";

import { useEffect } from "react";

/**
 * Pointer-driven motion, ported from karthik.qatechlabs.com:
 * - a rose light that follows the mouse across the page (body::before)
 * - a local spotlight inside the card under the pointer (.card::before)
 * - a gentle 3D tilt on cards marked .card-tilt
 * - primary buttons that pull slightly toward the pointer (magnetic)
 * One document-level listener, throttled to animation frames. Off for
 * touch devices and for visitors who prefer reduced motion.
 */
export function PointerEffects() {
  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const root = document.documentElement;
    let frame = 0;
    let lastCard: HTMLElement | null = null;
    let lastBtn: HTMLElement | null = null;

    const resetCard = (el: HTMLElement | null) => {
      if (!el) return;
      el.style.removeProperty("--tilt-x");
      el.style.removeProperty("--tilt-y");
      el.classList.remove("is-lit");
    };
    const resetBtn = (el: HTMLElement | null) => {
      if (!el) return;
      el.style.removeProperty("--mag-x");
      el.style.removeProperty("--mag-y");
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const { clientX: x, clientY: y } = event;
      const target = event.target instanceof Element ? event.target : null;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        root.style.setProperty("--spot-x", `${x}px`);
        root.style.setProperty("--spot-y", `${y}px`);

        const card = target?.closest<HTMLElement>(".card") ?? null;
        if (card !== lastCard) {
          resetCard(lastCard);
          lastCard = card;
        }
        if (card) {
          const r = card.getBoundingClientRect();
          card.style.setProperty("--spot-x", `${x - r.left}px`);
          card.style.setProperty("--spot-y", `${y - r.top}px`);
          card.classList.add("is-lit");
          if (card.classList.contains("card-tilt")) {
            const max = Number(card.dataset.tilt ?? 4);
            const px = (x - r.left) / r.width;
            const py = (y - r.top) / r.height;
            card.style.setProperty("--tilt-x", `${((0.5 - py) * 2 * max).toFixed(2)}deg`);
            card.style.setProperty("--tilt-y", `${((px - 0.5) * 2 * max).toFixed(2)}deg`);
          }
        }

        const btn = target?.closest<HTMLElement>(".btn-primary") ?? null;
        if (btn !== lastBtn) {
          resetBtn(lastBtn);
          lastBtn = btn;
        }
        if (btn) {
          const r = btn.getBoundingClientRect();
          btn.style.setProperty("--mag-x", `${((x - r.left - r.width / 2) * 0.25).toFixed(1)}px`);
          btn.style.setProperty("--mag-y", `${((y - r.top - r.height / 2) * 0.25).toFixed(1)}px`);
        }
      });
    };

    const onLeave = () => {
      cancelAnimationFrame(frame);
      resetCard(lastCard);
      resetBtn(lastBtn);
      lastCard = null;
      lastBtn = null;
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      onLeave();
    };
  }, []);

  return null;
}
