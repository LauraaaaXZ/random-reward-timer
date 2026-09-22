import { CalendarProvider, CalendarSyncRange, ExternalCalendarEvent } from './types';

const GRAPH_ROOT = 'https://graph.microsoft.com/v1.0';

type GraphDateTime = { dateTime: string; timeZone: string };
type GraphEvent = {
  id: string;
  subject?: string;
  start: GraphDateTime;
  end: GraphDateTime;
  isAllDay?: boolean;
  isCancelled?: boolean;
};
type GraphPage = { value: GraphEvent[]; '@odata.nextLink'?: string };

function graphDate(value: GraphDateTime) {
  // calendarView returns dateTime plus a time-zone label. Request UTC so parsing is deterministic.
  return value.dateTime.endsWith('Z') ? value.dateTime : `${value.dateTime}Z`;
}

export function createOutlookProvider(getAccessToken: () => Promise<string>): CalendarProvider {
  return {
    id: 'outlook',
    label: 'Outlook Calendar',
    readOnly: true,
    async listEvents(range: CalendarSyncRange): Promise<ExternalCalendarEvent[]> {
      const token = await getAccessToken();
      const query = new URLSearchParams({ startDateTime: range.startAt, endDateTime: range.endAt });
      let url: string | undefined = `${GRAPH_ROOT}/me/calendar/calendarView?${query.toString()}`;
      const events: ExternalCalendarEvent[] = [];

      while (url) {
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Prefer: 'outlook.timezone="UTC"',
          },
        });
        if (!response.ok) throw new Error(`Outlook calendar sync failed (${response.status}).`);
        const page: GraphPage = await response.json();
        for (const event of page.value) {
          if (event.isCancelled) continue;
          events.push({
            externalId: event.id,
            title: event.subject?.trim() || 'Busy',
            startAt: graphDate(event.start),
            endAt: graphDate(event.end),
            isAllDay: event.isAllDay,
            isCancelled: event.isCancelled,
          });
        }
        url = page['@odata.nextLink'];
      }
      return events;
    },
  };
}
