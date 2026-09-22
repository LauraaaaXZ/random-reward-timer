import { Task } from '../domain/types';

export function eligibleTasks(tasks: Task[]) {
  return tasks.filter(
    (task) =>
      task.status === 'active' &&
      task.remainingMinutes > 0,
  );
}

export function difficultyTasks(tasks: Task[]) {
  return eligibleTasks(tasks).filter(
    (task) =>
      task.difficulty === 'hard' ||
      task.difficulty === 'super_difficult' ||
      task.avoidanceCount > 2,
  );
}

export function preferredTasks(tasks: Task[]) {
  return eligibleTasks(tasks).filter((task) => task.preferredToday);
}
