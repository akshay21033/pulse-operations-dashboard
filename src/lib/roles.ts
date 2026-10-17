import type { Role } from "./types";

// Client-safe role constants (lib/auth.ts imports next/headers and is server-only).
export const ROLE_LABEL: Record<Role, string> = { viewer: "Viewer", manager: "Manager" };
