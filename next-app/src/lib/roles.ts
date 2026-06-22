export type SelfAssignableRole = "client" | "freelancer";

export function isSelfAssignableRole(role: unknown): role is SelfAssignableRole {
  return role === "client" || role === "freelancer";
}
