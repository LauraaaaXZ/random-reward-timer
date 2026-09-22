import { listCalendarBlocks } from '../data/calendarRepository';
import { CalendarBlock } from '../domain/types';
import { CalendarProvider } from './providers/types';

export async function loadUnifiedCalendar(input: {
  startAt: string;
  endAt: string;
  externalProvider?: CalendarProvider;
}): Promise<CalendarBlock[]> {
  const local = await listCalendarBlocks(input.startAt, input.endAt);
  if (!input.externalProvider) return local;

  const external = await input.externalProvider.listEvents({ startAt: input.startAt, endAt: input.endAt });
  const outlookBlocks: CalendarBlock[] = external.map((event) => ({
    id: `${input.externalProvider!.id}:${event.externalId}`,
    title: event.title,
    startAt: event.startAt,
    endAt: event.endAt,
    kind: 'calendar',
  }));

  return [...local, ...outlookBlocks].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );
}
