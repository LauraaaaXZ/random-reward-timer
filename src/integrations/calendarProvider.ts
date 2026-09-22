import { CalendarBlock } from '../domain/types';

export type CalendarProviderId = 'outlook';

export type ExternalCalendarEvent = {
  provider: CalendarProviderId;
  externalId: string;
  calendarId?: string;
  calendarName?: string;
  title: string;
  startAt: string;
  endAt: string;
  isAllDay?: boolean;
  showAs?: string;
  lastModifiedAt?: string;
};

export interface CalendarProvider {
  id: CalendarProviderId;
  fetchEvents(input: {
    accessToken: string;
    startAt: string;
    endAt: string;
  }): Promise<ExternalCalendarEvent[]>;
}

export function eventToBlock(event: ExternalCalendarEvent): CalendarBlock {
  return {
    id: `${event.provider}:${event.calendarId ?? 'default'}:${event.externalId}`,
    title: event.title,
    startAt: event.startAt,
    endAt: event.endAt,
    kind: 'calendar',
  };
}
