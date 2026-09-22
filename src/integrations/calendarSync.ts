import { replaceExternalCalendarEvents } from '../data/calendarRepository';
import { CalendarProvider } from './calendarProvider';

export async function syncCalendarProvider(
  provider: CalendarProvider,
  input: {
    accessToken: string;
    startAt: string;
    endAt: string;
  },
) {
  const events = await provider.fetchEvents(input);

  await replaceExternalCalendarEvents(
    provider.id,
    input.startAt,
    input.endAt,
    events.map((event) => ({
      provider: event.provider,
      externalId: event.externalId,
      title: event.title,
      startAt: event.startAt,
      endAt: event.endAt,
      isAllDay: event.isAllDay,
      lastModifiedAt: event.lastModifiedAt,
    })),
  );

  return events.length;
}
