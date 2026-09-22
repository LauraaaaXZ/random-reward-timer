import { CalendarProvider, ExternalCalendarEvent } from './calendarProvider';

const GRAPH_ROOT = 'https://graph.microsoft.com/v1.0';

type GraphDateTime = {
  dateTime: string;
  timeZone: string;
};

type GraphEvent = {
  id: string;
  subject?: string | null;
  start: GraphDateTime;
  end: GraphDateTime;
  isCancelled?: boolean;
  isAllDay?: boolean;
  lastModifiedDateTime?: string;
};

type GraphPage = {
  value: GraphEvent[];
  '@odata.nextLink'?: string;
};

function asUtcIso(dateTime: GraphDateTime) {
  // The request asks Graph to return UTC. Append Z only when Graph gives
  // a timezone-less ISO value.
  if (/[zZ]|[+-]\d\d:\d\d$/.test(dateTime.dateTime)) {
    return new Date(dateTime.dateTime).toISOString();
  }
  return new Date(`${dateTime.dateTime}Z`).toISOString();
}

export const outlookCalendarProvider: CalendarProvider = {
  id: 'outlook',

  async fetchEvents({ accessToken, startAt, endAt }) {
    const params = new URLSearchParams({
      startDateTime: startAt,
      endDateTime: endAt,
      '$select': 'id,subject,start,end,isCancelled,isAllDay,lastModifiedDateTime',
      '$orderby': 'start/dateTime',
      '$top': '200',
    });

    let url: string | undefined = `${GRAPH_ROOT}/me/calendarView?${params.toString()}`;
    const events: ExternalCalendarEvent[] = [];

    while (url) {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Prefer: 'outlook.timezone="UTC"',
        },
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Outlook calendar sync failed (${response.status}): ${detail.slice(0, 240)}`);
      }

      const page = await response.json() as GraphPage;
      for (const event of page.value) {
        if (event.isCancelled) continue;
        const start = asUtcIso(event.start);
        const end = asUtcIso(event.end);
        if (new Date(end).getTime() <= new Date(start).getTime()) continue;

        events.push({
          provider: 'outlook',
          externalId: event.id,
          title: event.subject?.trim() || 'Busy',
          startAt: start,
          endAt: end,
          isAllDay: Boolean(event.isAllDay),
          lastModifiedAt: event.lastModifiedDateTime,
        });
      }

      url = page['@odata.nextLink'];
    }

    return events;
  },
};
