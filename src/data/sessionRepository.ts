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
  const existing = await db.getFirstAsync<{ ended_at: string | null }>(
    'SELECT ended_at FROM focus_sessions WHERE id = ?',
    sessionId,
  );
  if (!existing) throw new Error('Focus session was not found.');
  if (existing.ended_at) return false;
  await db.runAsync(
    'UPDATE focus_sessions SET actual_minutes = ?, ended_at = ? WHERE id = ? AND ended_at IS NULL',
    actualMinutes,
    new Date().toISOString(),
    sessionId,
  );
  return true;
}
