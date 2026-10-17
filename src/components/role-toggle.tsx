"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { apiRequest } from "@/lib/client-api";
import { ROLE_LABEL } from "@/lib/roles";
import type { Role } from "@/lib/types";

/** Mock sign-in switch. The server only trusts the cookie it sets, never this client state. */
export function RoleToggle({ role }: { role: Role }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const next: Role = role === "manager" ? "viewer" : "manager";

  async function switchRole() {
    setError(null);
    const res = await apiRequest("/api/session", { method: "POST", body: { role: next } });
    if (!res.ok) return setError(res.message);
    startTransition(() => router.refresh());
  }

  return (
    <div className="profile">
      <button
        type="button"
        className="role-toggle"
        onClick={switchRole}
        disabled={pending}
        aria-label={`Signed in as ${ROLE_LABEL[role]}. Switch to ${ROLE_LABEL[next]}.`}
      >
        <span className="profile-pic" aria-hidden="true">
          {role === "manager" ? "MG" : "VW"}
        </span>
        <span className="profile-info">
          <strong>{ROLE_LABEL[role]}</strong>
          <small>{pending ? "Switching…" : `Switch to ${ROLE_LABEL[next]}`}</small>
        </span>
      </button>
      {error && (
        <span className="sr-only" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
