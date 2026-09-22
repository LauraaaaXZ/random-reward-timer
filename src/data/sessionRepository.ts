import { getDatabase } from './database';
import { DrawMode, SessionPool } from '../domain/types';
import { randomUUID } from '../utils/id';

export async function startSession(input: {
  taskId: string;
  pool: SessionPool;
  drawMode: DrawMode;
  commitmentMinutes: number;
}) {
  const db = await getDatabase();
  const id = randomUUID();
  await db.runAsync(
    `INSERT INTO focus_sessions (id, task_id, pool, draw_mode, commitment_minutes, started_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    id,
    input.taskId,
    String(input.pool),
    input.drawMode,
    input.commitmentMinutes,
    new Date().toISOString(),
  );
  return id;
}

export async function finishSession(sessionId: string, actualMinutes: number) {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE focus_sessions SET actual_minutes = ?, ended_at = ? WHERE id = ?',
    actualMinutes,
    new Date().toISOString(),
    sessionId,
  );
}
