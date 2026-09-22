import { getDatabase } from './database';
import { CalendarBlock, CalendarBlockKind } from '../domain/types';
import { randomUUID } from '../utils/id';

type CalendarRow = {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  kind: CalendarBlockKind;
};

function rowToBlock(row: CalendarRow): CalendarBlock {
  return { id: row.id, title: row.title, startAt: row.start_at, endAt: row.end_at, kind: row.kind };
}

export async function listCalendarBlocks(startAt: string, endAt: string): Promise<CalendarBlock[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<CalendarRow>(
    `SELECT id, title, start_at, end_at, kind FROM calendar_blocks
     WHERE end_at > ? AND start_at < ? ORDER BY start_at`,
    startAt,
    endAt,
  );
  return rows.map(rowToBlock);
}

export async function addCalendarBlock(input: {
  title: string;
  startAt: string;
  endAt: string;
  kind?: CalendarBlockKind;
}) {
  if (new Date(input.endAt).getTime() <= new Date(input.startAt).getTime()) {
    throw new Error('Calendar block must end after it starts.');
  }
  const db = await getDatabase();
  const id = randomUUID();
  await db.runAsync(
    'INSERT INTO calendar_blocks (id, title, start_at, end_at, kind) VALUES (?, ?, ?, ?, ?)',
    id, input.title.trim(), input.startAt, input.endAt, input.kind ?? 'calendar',
  );
  return id;
}

export async function removeCalendarBlock(id: string) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM calendar_blocks WHERE id = ?', id);
}
