import { getDatabase } from './database';
import { randomUUID } from '../utils/id';

export type ScheduledRoutine = {
  id: string;
  name: string;
  targetTime: string;
  windowStart: string;
  windowEnd: string;
  active: boolean;
  createdAt: string;
};

export type RoutineToday = ScheduledRoutine & {
  localDate: string;
  completed: boolean;
  completedAt?: string;
  status: 'upcoming' | 'open' | 'completed' | 'missed';
};

function validateTime(value: string) {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('Use HH:MM.');
}

function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function minuteOfDay(value: string) {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

function currentMinute(now = new Date()) {
  return now.getHours() * 60 + now.getMinutes();
}

export async function createScheduledRoutine(input: {
  name: string;
  targetTime: string;
  windowStart: string;
  windowEnd: string;
}) {
  const name = input.name.trim();
  if (!name) throw new Error('Routine name required.');
  validateTime(input.targetTime);
  validateTime(input.windowStart);
  validateTime(input.windowEnd);
  if (minuteOfDay(input.windowEnd) <= minuteOfDay(input.windowStart)) {
    throw new Error('Routine window must end after it starts on the same day.');
  }
  const db = await getDatabase();
  const id = randomUUID();
  await db.runAsync(
    'INSERT INTO scheduled_routines (id,name,target_time,window_start,window_end,repeat_mode,active,created_at) VALUES (?,?,?,?,?,?,1,?)',
    id,
    name,
    input.targetTime,
    input.windowStart,
    input.windowEnd,
    'daily',
    new Date().toISOString(),
  );
  return id;
}

export async function listScheduledRoutines(): Promise<ScheduledRoutine[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    target_time: string;
    window_start: string;
    window_end: string;
    active: number;
    created_at: string;
  }>('SELECT id,name,target_time,window_start,window_end,active,created_at FROM scheduled_routines WHERE active=1 ORDER BY target_time');
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    targetTime: r.target_time,
    windowStart: r.window_start,
    windowEnd: r.window_end,
    active: Boolean(r.active),
    createdAt: r.created_at,
  }));
}

export async function listTodayRoutines(now = new Date()): Promise<RoutineToday[]> {
  const db = await getDatabase();
  const routines = await listScheduledRoutines();
  const localDate = localDateKey(now);
  const rows = await db.getAllAsync<{ routine_id: string; completed_at: string }>(
    'SELECT routine_id,completed_at FROM routine_completions WHERE local_date=?',
    localDate,
  );
  const completed = new Map(rows.map(r => [r.routine_id, r.completed_at]));
  const current = currentMinute(now);
  return routines.map(r => {
    const doneAt = completed.get(r.id);
    let status: RoutineToday['status'];
    if (doneAt) status = 'completed';
    else if (current < minuteOfDay(r.windowStart)) status = 'upcoming';
    else if (current <= minuteOfDay(r.windowEnd)) status = 'open';
    else status = 'missed';
    return { ...r, localDate, completed: Boolean(doneAt), completedAt: doneAt, status };
  });
}

export async function completeScheduledRoutine(routineId: string, now = new Date()) {
  const db = await getDatabase();
  const localDate = localDateKey(now);
  await db.runAsync(
    'INSERT OR IGNORE INTO routine_completions (routine_id,local_date,completed_at) VALUES (?,?,?)',
    routineId,
    localDate,
    now.toISOString(),
  );
  return localDate;
}

export async function archiveScheduledRoutine(routineId: string) {
  const db = await getDatabase();
  await db.runAsync('UPDATE scheduled_routines SET active=0 WHERE id=?', routineId);
}
