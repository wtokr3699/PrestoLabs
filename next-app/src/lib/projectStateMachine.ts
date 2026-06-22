import { ProjectStatus } from "@/types";

const ALLOWED_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  open: ["in_review", "closed"],
  in_review: ["open", "matched", "closed"],
  matched: ["in_progress", "closed"],
  in_progress: ["submitted", "closed"],
  submitted: ["completed", "in_progress"],
  completed: [],
  closed: [],
};

export function canTransition(from: ProjectStatus, to: ProjectStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: ProjectStatus, to: ProjectStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`상태 전환 불가: ${from} → ${to}`);
  }
}
