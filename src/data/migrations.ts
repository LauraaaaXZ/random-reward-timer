import { getDatabase } from './database';

export async function migrateDatabase() {
  const db = await getDatabase();

  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      estimated_minutes INTEGER NOT NULL CHECK (estimated_minutes > 0),
      remaining_minutes INTEGER NOT NULL CHECK (remaining_minutes >= 0),
      difficulty TEXT NOT NULL CHECK (difficulty IN ('easy','medium','hard','super_difficult')),
      status TEXT NOT NULL CHECK (status IN ('active','locked','completed','archived')),
      deadline_at TEXT,
      final_work_window_at TEXT,
      preferred_today INTEGER NOT NULL DEFAULT 0,
      avoidance_count INTEGER NOT NULL DEFAULT 0,
      recovery_stack REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS task_dependencies (
      prerequisite_task_id TEXT NOT NULL,
      dependent_task_id TEXT NOT NULL,
      PRIMARY KEY (prerequisite_task_id, dependent_task_id),
      FOREIGN KEY (prerequisite_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (dependent_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      CHECK (prerequisite_task_id <> dependent_task_id)
    );

    CREATE TABLE IF NOT EXISTS focus_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      task_id TEXT NOT NULL,
      pool TEXT NOT NULL,
      draw_mode TEXT NOT NULL,
      commitment_minutes INTEGER NOT NULL,
      actual_minutes INTEGER,
      started_at TEXT,
      ended_at TEXT,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline_at);
    CREATE INDEX IF NOT EXISTS idx_dependencies_dependent ON task_dependencies(dependent_task_id);
  `);
}
