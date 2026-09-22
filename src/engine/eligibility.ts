import { Task } from '../domain/types';

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function wasDailyTaskCompletedToday(task: Task, now = new Date()) {
  return Boolean(task.dailyPoolMode && task.dailyLastCompletedDate === localDateKey(now));
}

export function eligibleTasks(tasks: Task[], now = new Date()) {
  return tasks.filter(
    (task) =>
      task.status === 'active' &&
      task.remainingMinutes > 0 &&
      !wasDailyTaskCompletedToday(task, now) &&
      task.dailyPoolMode !== 'fragment',
  );
}

export function fragmentDailyTasks(tasks: Task[], now = new Date()) {
  return tasks.filter(
    (task) =>
      task.status === 'active' &&
      Boolean(task.dailyPoolMode) &&
      !wasDailyTaskCompletedToday(task, now) &&
      (task.dailyPoolMode === 'fragment' || task.dailyPoolMode === 'both'),
  );
}

export function difficultyTasks(tasks: Task[], now = new Date()) {
  return eligibleTasks(tasks, now).filter(
    (task) =>
      !task.dailyPoolMode &&
      (task.difficulty === 'hard' ||
      task.difficulty === 'super_difficult' ||
      task.avoidanceCount > 2),
  );
}

export function preferredTasks(tasks: Task[], now = new Date()) {
  return eligibleTasks(tasks, now).filter((task) => task.preferredToday);
}
