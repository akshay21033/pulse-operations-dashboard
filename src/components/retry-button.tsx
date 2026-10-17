"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RefreshCw } from "lucide-react";

/** Re-runs the current route's server data fetching. Shows progress so it never looks dead. */
export function RetryButton({
  label = "Try again",
  className = "button-primary",
}: {
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      <RefreshCw size={14} aria-hidden="true" />
      {pending ? "Retrying…" : label}
    </button>
  );
}
