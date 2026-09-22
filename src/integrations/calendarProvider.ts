import { CalendarBlock } from '../domain/types';

export type CalendarProviderId = 'outlook';

export type ExternalCalendarEvent = {
  provider: CalendarProviderId;
  externalId: string;
  title: string;
  startAt: string;
  endAt: string;
  isAllDay?: boolean;
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
    id: `${event.provider}:${event.externalId}`,
    title: event.title,
    startAt: event.startAt,
    endAt: event.endAt,
    kind: 'calendar',
  };
}
