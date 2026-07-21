"use client";

import { useEffect, useRef, useCallback } from "react";

/** Format elapsed seconds as HH:MM:SS for SCORM 1.2 cmi.core.session_time */
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export function useSCORM(totalModules: number) {
  const elapsedRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initializedRef = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scormRef = useRef<any>(null);

  useEffect(() => {
    // Only runs in browser — SCORM API is injected by the LMS into window
    let SCORM: typeof scormRef.current = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      SCORM = require("pipwerks-scorm-api-wrapper").default;
      scormRef.current = SCORM;
      SCORM.version = "1.2";
      const ok = SCORM.init();
      initializedRef.current = ok;
      if (ok) {
        console.log("[SCORM] ✅ LMSInitialize — session started");
      } else {
        console.warn("[SCORM] ⚠️  LMSInitialize failed — not inside an LMS");
      }
    } catch {
      console.warn("[SCORM] ⚠️  Not inside an LMS — SCORM calls are disabled");
    }

    // Start session timer
    intervalRef.current = setInterval(() => {
      elapsedRef.current += 1;
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (initializedRef.current && scormRef.current) {
        try {
          const time = formatTime(elapsedRef.current);
          scormRef.current.set("cmi.core.session_time", time);
          scormRef.current.save();
          scormRef.current.quit();
          console.log(`[SCORM] 🏁 LMSFinish — session ended (time: ${time})`);
        } catch {
          console.warn("[SCORM] ⚠️  LMSFinish failed");
        }
      }
    };
  }, []);

  const reportComplete = useCallback((completedCount: number) => {
    if (!initializedRef.current || !scormRef.current) {
      console.log(`[SCORM] ℹ️  reportComplete called (${completedCount}/${totalModules}) — no LMS connected`);
      return;
    }
    try {
      const status = completedCount >= totalModules ? "completed" : "incomplete";
      const time = formatTime(elapsedRef.current);
      scormRef.current.set("cmi.core.lesson_status", status);
      scormRef.current.set("cmi.core.session_time", time);
      scormRef.current.save();
      console.log(`[SCORM] 📡 Sending → lesson_status: "${status}", session_time: "${time}" (${completedCount}/${totalModules} modules)`);
    } catch {
      console.warn("[SCORM] ⚠️  Failed to send data to LMS");
    }
  }, [totalModules]);

  const getElapsed = useCallback(() => elapsedRef.current, []);

  return { reportComplete, getElapsed };
}
