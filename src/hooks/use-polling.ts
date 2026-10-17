"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Options = { baseMs: number; maxMs: number };
export type PollingState = {
  phase: "live" | "retrying" | "paused";
  busy: boolean;
  lastOkAt: number | null;
  /** Delay before the next attempt, so the UI can say "retrying in ~20s". */
  nextInMs: number;
};

/**
 * Polls `task` with exponential backoff + jitter on failure (task returns false),
 * pauses while the tab is hidden, and supports manual refresh and temporary pauses.
 * Chosen over SSE because it works on serverless hosts and degrades gracefully.
 */
export function usePolling(task: () => Promise<boolean>, { baseMs, maxMs }: Options) {
  const [state, setState] = useState<PollingState>({ phase: "live", busy: false, lastOkAt: null, nextInMs: baseMs });
  const taskRef = useRef(task);
  const pausedUntil = useRef(0);
  const pollNowRef = useRef<() => void>(() => {});

  useEffect(() => {
    taskRef.current = task;
  });

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;

    const schedule = (delay: number) => {
      clearTimeout(timer);
      timer = setTimeout(run, delay);
    };

    async function run() {
      if (cancelled || document.hidden) return; // resumes via visibilitychange
      const pausedFor = pausedUntil.current - Date.now();
      if (pausedFor > 0) {
        setState((s) => ({ ...s, phase: "paused", busy: false, nextInMs: pausedFor }));
        return schedule(pausedFor);
      }
      setState((s) => ({ ...s, busy: true }));
      const ok = await taskRef.current();
      if (cancelled) return;
      failures = ok ? 0 : failures + 1;
      const delay = ok ? baseMs : Math.min(maxMs, baseMs * 2 ** failures) * (0.8 + Math.random() * 0.4);
      setState((s) => ({
        phase: ok ? "live" : "retrying",
        busy: false,
        lastOkAt: ok ? Date.now() : s.lastOkAt,
        nextInMs: delay,
      }));
      schedule(delay);
    }

    const onVisibility = () => {
      if (!document.hidden) schedule(0);
    };

    pollNowRef.current = () => schedule(0);
    document.addEventListener("visibilitychange", onVisibility);
    schedule(baseMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [baseMs, maxMs]);

  const pollNow = useCallback(() => pollNowRef.current(), []);
  const pauseFor = useCallback((ms: number) => {
    pausedUntil.current = Date.now() + ms;
  }, []);

  return { ...state, pollNow, pauseFor };
}
