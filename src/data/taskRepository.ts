import { getDatabase } from './database';
import { Difficulty, Task, TaskDependency, TaskStatus } from '../domain/types';

type TaskRow = {
  id: string;
  name: string;
  estimated_minutes: number;
  remaining_minutes: number;
  difficulty: Difficulty;
  status: TaskStatus;
  deadline_at: string | null;
  final_work_window_at: string | null;
  preferred_today: number;
  avoidance_count: number;
  recovery_stack: number;
  created_at: string;
  completed_at: string | null;
};

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    name: row.name,
    estimatedMinutes: row.estimated_minutes,
    remainingMinutes: row.remaining_minutes,
    difficulty: row.difficulty,
    status: row.status,
    deadlineAt: row.deadline_at ?? undefined,
    finalWorkWindowAt: row.final_work_window_at ?? undefined,
    preferredToday: Boolean(row.preferred_today),
    avoidanceCount: row.avoidance_count,
    recoveryStack: row.recovery_stack,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? undefined,
  };
}

export async function listTasks(): Promise<Task[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TaskRow>(
    'SELECT * FROM tasks WHERE status <> ? ORDER BY created_at DESC',
    'archived',
  );
  return rows.map(rowToTask);
}

export async function createTask(task: Task, prerequisiteIds: string[] = []) {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO tasks (
        id, name, estimated_minutes, remaining_minutes, difficulty, status,
        deadline_at, final_work_window_at, preferred_today, avoidance_count,
        recovery_stack, created_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      task.id,
      task.name,
      task.estimatedMinutes,
      task.remainingMinutes,
      task.difficulty,
      task.status,
      task.deadlineAt ?? null,
      task.finalWorkWindowAt ?? null,
      task.preferredToday ? 1 : 0,
      task.avoidanceCount,
      task.recoveryStack,
      task.createdAt,
      task.completedAt ?? null,
    );

    for (const prerequisiteTaskId of prerequisiteIds) {
      await db.runAsync(
        'INSERT INTO task_dependencies (prerequisite_task_id, dependent_task_id) VALUES (?, ?)',
        prerequisiteTaskId,
        task.id,
      );
    }
  });
}

export async function updateTask(task: Task) {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE tasks SET
      name = ?, estimated_minutes = ?, remaining_minutes = ?, difficulty = ?,
      status = ?, deadline_at = ?, final_work_window_at = ?, preferred_today = ?,
      avoidance_count = ?, recovery_stack = ?, completed_at = ?
    WHERE id = ?`,
    task.name,
    task.estimatedMinutes,
    task.remainingMinutes,
    task.difficulty,
    task.status,
    task.deadlineAt ?? null,
    task.finalWorkWindowAt ?? null,
    task.preferredToday ? 1 : 0,
    task.avoidanceCount,
    task.recoveryStack,
    task.completedAt ?? null,
    task.id,
  );
}

export async function archiveTask(taskId: string) {
  const db = await getDatabase();
  await db.runAsync('UPDATE tasks SET status = ? WHERE id = ?', 'archived', taskId);
}

export async function listDependencies(): Promise<TaskDependency[]> {
  const db = await getDatabase();
  return db.getAllAsync<TaskDependency>(
    'SELECT prerequisite_task_id AS prerequisiteTaskId, dependent_task_id AS dependentTaskId FROM task_dependencies',
  );
}

export async function replaceDependencies(taskId: string, prerequisiteIds: string[]) {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM task_dependencies WHERE dependent_task_id = ?', taskId);
    for (const prerequisiteTaskId of prerequisiteIds) {
      await db.runAsync(
        'INSERT INTO task_dependencies (prerequisite_task_id, dependent_task_id) VALUES (?, ?)',
        prerequisiteTaskId,
        taskId,
      );
    }
  });
}
