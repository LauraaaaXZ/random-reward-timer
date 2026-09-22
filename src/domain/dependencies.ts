import { Task, TaskDependency } from './types';

export function prerequisitesFor(taskId: string, dependencies: TaskDependency[]) {
  return dependencies
    .filter((edge) => edge.dependentTaskId === taskId)
    .map((edge) => edge.prerequisiteTaskId);
}

export function isTaskUnlocked(
  task: Task,
  tasks: Task[],
  dependencies: TaskDependency[],
): boolean {
  const prerequisiteIds = prerequisitesFor(task.id, dependencies);
  return prerequisiteIds.every(
    (id) => tasks.find((candidate) => candidate.id === id)?.status === 'completed',
  );
}

export function wouldCreateCycle(
  prerequisiteTaskId: string,
  dependentTaskId: string,
  dependencies: TaskDependency[],
): boolean {
  if (prerequisiteTaskId === dependentTaskId) return true;

  const adjacency = new Map<string, string[]>();
  for (const edge of dependencies) {
    const next = adjacency.get(edge.prerequisiteTaskId) ?? [];
    next.push(edge.dependentTaskId);
    adjacency.set(edge.prerequisiteTaskId, next);
  }

  // Adding prerequisite -> dependent is invalid if dependent already reaches prerequisite.
  const stack = [dependentTaskId];
  const visited = new Set<string>();
  while (stack.length) {
    const current = stack.pop()!;
    if (current === prerequisiteTaskId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    stack.push(...(adjacency.get(current) ?? []));
  }
  return false;
}
