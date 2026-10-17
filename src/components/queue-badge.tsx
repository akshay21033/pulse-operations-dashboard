"use client";

import { useEffect, useState } from "react";

export const QUEUE_COUNT_EVENT = "pulse:queue-count";

/** Sidebar counter. Starts from the server value and follows the live queue via a window event. */
export function QueueBadge({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial);
  useEffect(() => {
    const onCount = (event: Event) => setCount((event as CustomEvent<number>).detail);
    window.addEventListener(QUEUE_COUNT_EVENT, onCount);
    return () => window.removeEventListener(QUEUE_COUNT_EVENT, onCount);
  }, []);
  return (
    <span className="nav-count" aria-label={`${count} open`}>
      {count}
    </span>
  );
}
