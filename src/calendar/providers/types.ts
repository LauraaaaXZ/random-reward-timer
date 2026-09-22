export type ExternalCalendarEvent = {
  externalId: string;
  calendarId?: string;
  title: string;
  startAt: string;
  endAt: string;
  isAllDay?: boolean;
  isCancelled?: boolean;
};

export type CalendarSyncRange = {
  startAt: string;
  endAt: string;
};

export interface CalendarProvider {
  id: string;
  label: string;
  readOnly: boolean;
  listEvents(range: CalendarSyncRange): Promise<ExternalCalendarEvent[]>;
}
