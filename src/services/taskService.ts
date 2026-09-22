import { randomUUID } from '../utils/id';
import { isTaskUnlocked, wouldCreateCycle } from '../domain/dependencies';
import { Difficulty, Task } from '../domain/types';
import {
  createTask,
  listDependencies,
  listTasks,
  replaceDependencies,
  updateTask,
} from '../data/taskRepository';

export type CreateTaskInput = {
  name: string;
  estimatedMinutes: number;
  difficulty: Difficulty;
  deadlineAt?: string;
  prerequisiteIds?: string[];
};

export async function createTaskWithDependencies(input: CreateTaskInput) {
  const [tasks, dependencies] = await Promise.all([listTasks(), listDependencies()]);
  const prerequisiteIds = input.prerequisiteIds ?? [];
  const id = randomUUID();

  for (const prerequisiteTaskId of prerequisiteIds) {
    if (wouldCreateCycle(prerequisiteTaskId, id, dependencies)) {
      throw new Error('This prerequisite would create a dependency cycle.');
    }
  }

  const now = new Date().toISOString();
  const task: Task = {
    id,
    name: input.name.trim(),
    estimatedMinutes: input.estimatedMinutes,
    remainingMinutes: input.estimatedMinutes,
    difficulty: input.difficulty,
    status: prerequisiteIds.length ? 'locked' : 'active',
    deadlineAt: input.deadlineAt,
    preferredToday: false,
    avoidanceCount: 0,
    recoveryStack: 0,
    createdAt: now,
  };

  await createTask(task, prerequisiteIds);
  return task;
}

export async function setPrerequisites(taskId: string, prerequisiteIds: string[]) {
  const [tasks, dependencies] = await Promise.all([listTasks(), listDependencies()]);

  for (const prerequisiteTaskId of prerequisiteIds) {
    if (wouldCreateCycle(prerequisiteTaskId, taskId, dependencies.filter(
      (edge) => edge.dependentTaskId !== taskId,
    ))) {
      throw new Error('This prerequisite would create a dependency cycle.');
    }
  }

  await replaceDependencies(taskId, prerequisiteIds);
  await refreshTaskLocks();
}

export async function markTaskCompleted(taskId: string) {
  const tasks = await listTasks();
  const task = tasks.find((candidate) => candidate.id === taskId);
  if (!task) throw new Error('Task not found.');

  await updateTask({
    ...task,
    remainingMinutes: 0,
    status: 'completed',
    completedAt: new Date().toISOString(),
  });
  await refreshTaskLocks();
}

export async function refreshTaskLocks() {
  const [tasks, dependencies] = await Promise.all([listTasks(), listDependencies()]);

  for (const task of tasks) {
    if (task.status === 'completed' || task.status === 'archived') continue;
    const unlocked = isTaskUnlocked(task, tasks, dependencies);
    const nextStatus = unlocked ? 'active' : 'locked';
    if (task.status !== nextStatus) {
      await updateTask({ ...task, status: nextStatus });
    }
  }
}
