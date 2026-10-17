"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Bell, ClipboardList, LayoutDashboard, Package } from "lucide-react";
import type { Role } from "@/lib/types";
import { RoleToggle } from "./role-toggle";

const nav = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/shipments", label: "Shipments", icon: Package },
  { href: "/exceptions", label: "Exception queue", icon: Bell },
];

export function Sidebar({ role, queueBadge }: { role: Role; queueBadge: ReactNode }) {
  const path = usePathname();
  const items = role === "manager" ? [...nav, { href: "/audit", label: "Audit log", icon: ClipboardList }] : nav;

  return (
    <aside className="sidebar">
      <Link href="/" className="brand" aria-label="Pulse Ops home">
        <span className="brand-mark">
          <Activity size={18} strokeWidth={2.5} aria-hidden="true" />
        </span>
        <span>
          pulse<span className="brand-period">.</span>
        </span>
        <span className="brand-tag">OPS</span>
      </Link>

      <div className="workspace-switch" role="group" aria-label="Workspace: Northstar Logistics">
        <span className="workspace-avatar" aria-hidden="true">
          N
        </span>
        <span className="workspace-copy">
          <strong>Northstar Logistics</strong>
          <small>Operations team</small>
        </span>
      </div>

      <div className="nav-label">WORKSPACE</div>
      <nav className="nav-list" aria-label="Main navigation">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={`nav-item ${active ? "active" : ""}`}
            >
              <Icon size={17} aria-hidden="true" />
              <span>{label}</span>
              {href === "/exceptions" && queueBadge}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <RoleToggle role={role} />
      </div>
    </aside>
  );
}
