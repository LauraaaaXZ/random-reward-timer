import { getDatabase } from './database';
import { CalendarBlock, CalendarBlockKind } from '../domain/types';
import { randomUUID } from '../utils/id';
import { listMealSchedules } from './mealScheduleRepository';

type CalendarRow = {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  kind: CalendarBlockKind;
};

type ExternalCalendarRow = {
  provider: string;
  external_id: string;
  title: string;
  start_at: string;
  end_at: string;
};

export type ExternalCalendarEventInput = {
  provider: string;
  externalId: string;
  title: string;
  startAt: string;
  endAt: string;
  isAllDay?: boolean;
  lastModifiedAt?: string;
};

function rowToBlock(row: CalendarRow): CalendarBlock {
  return { id: row.id, title: row.title, startAt: row.start_at, endAt: row.end_at, kind: row.kind };
}

function localDateKey(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}

function externalRowToBlock(row: ExternalCalendarRow): CalendarBlock {
  return {
    id: `${row.provider}:${row.external_id}`,
    title: row.title,
    startAt: row.start_at,
    endAt: row.end_at,
    kind: 'calendar',
  };
}

export async function listCalendarBlocks(startAt: string, endAt: string): Promise<CalendarBlock[]> {
  const db = await getDatabase();
  const [localRows, externalRows, meals] = await Promise.all([
    db.getAllAsync<CalendarRow>(
      `SELECT id, title, start_at, end_at, kind FROM calendar_blocks
       WHERE end_at > ? AND start_at < ? ORDER BY start_at`,
      startAt,
      endAt,
    ),
    db.getAllAsync<ExternalCalendarRow>(
      `SELECT provider, external_id, title, start_at, end_at FROM external_calendar_events
       WHERE end_at > ? AND start_at < ? ORDER BY start_at`,
      startAt,
      endAt,
    ),
    listMealSchedules(),
  ]);

  const rangeStart=new Date(startAt),rangeEnd=new Date(endAt);
  const mealBlocks:CalendarBlock[]=[];
  const cursor=new Date(rangeStart);cursor.setHours(0,0,0,0);
  while(cursor<rangeEnd){
    const day=localDateKey(cursor);
    for(const meal of meals){
      const s=new Date(`${day}T${meal.startTime}:00`);
      const e=new Date(s.getTime()+60*60000);
      if(e>rangeStart&&s<rangeEnd)mealBlocks.push({id:`meal:${meal.id}:${day}`,title:meal.label,startAt:s.toISOString(),endAt:e.toISOString(),kind:'meal'});
    }
    cursor.setDate(cursor.getDate()+1);
  }
  return [
    ...localRows.map(rowToBlock),
    ...externalRows.map(externalRowToBlock),
    ...mealBlocks,
  ].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
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

export async function replaceExternalCalendarEvents(
  provider: string,
  startAt: string,
  endAt: string,
  events: ExternalCalendarEventInput[],
) {
  const db = await getDatabase();
  const syncedAt = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `DELETE FROM external_calendar_events
       WHERE provider = ? AND end_at > ? AND start_at < ?`,
      provider,
      startAt,
      endAt,
    );

    for (const event of events) {
      await db.runAsync(
        `INSERT OR REPLACE INTO external_calendar_events
         (provider, external_id, title, start_at, end_at, is_all_day, last_modified_at, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        event.provider,
        event.externalId,
        event.title,
        event.startAt,
        event.endAt,
        event.isAllDay ? 1 : 0,
        event.lastModifiedAt ?? null,
        syncedAt,
      );
    }
  });
}
