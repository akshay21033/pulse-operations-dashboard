import { cookies } from "next/headers";
import type { Role } from "./types";
export { ROLE_LABEL } from "./roles";

export const ROLE_COOKIE = "pulse_role";

/** Anything other than an explicit "manager" cookie is a viewer (least privilege). */
export function parseRole(value: string | undefined | null): Role {
  return value === "manager" ? "manager" : "viewer";
}

export async function getRole(): Promise<Role> {
  return parseRole((await cookies()).get(ROLE_COOKIE)?.value);
}
