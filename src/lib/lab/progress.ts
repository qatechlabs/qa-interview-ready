"use client";
import { useEffect, useState } from "react";

const KEY = "qir_lab_passed_v1";

function read(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function markLabPassed(id: string) {
  try {
    const cur = read();
    if (!cur[id]) {
      cur[id] = Date.now();
      localStorage.setItem(KEY, JSON.stringify(cur));
    }
    window.dispatchEvent(new Event("qir-lab-progress"));
  } catch {
    /* storage unavailable */
  }
}

export function useLabPassed() {
  const [passed, setPassed] = useState<Record<string, number>>({});
  useEffect(() => {
    const sync = () => setPassed(read());
    sync();
    window.addEventListener("qir-lab-progress", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("qir-lab-progress", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return passed;
}
