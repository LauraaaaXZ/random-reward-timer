import {
  EntityTypes,
  getCalendars,
  listEvents,
  requestCalendarPermissions,
} from 'expo-calendar';
import {replaceExternalCalendarEvents} from '../data/calendarRepository';

export const DEVICE_CALENDAR_NAMES=['日历','courses','MAIB7001','MAIB7002','MAIB7003','MAIB7005','boxing','tennis SmartPlay'] as const;
const INCLUDED=new Set<string>(DEVICE_CALENDAR_NAMES);
const PROVIDER='device-calendar';

export type DeviceCalendarSyncResult={calendarNames:string[];eventCount:number;skippedEventCount:number;startAt:string;endAt:string};

export async function syncDeviceCalendars(now=new Date()):Promise<DeviceCalendarSyncResult>{
  const permission=await requestCalendarPermissions();
  if(permission.status!=='granted')throw new Error('Calendar permission is required to sync Outlook events from your phone.');

  const calendars=await getCalendars(EntityTypes.EVENT);
  const selected=calendars.filter(c=>INCLUDED.has(c.title));

  const start=new Date(now);start.setDate(start.getDate()-7);start.setHours(0,0,0,0);
  const end=new Date(now);end.setDate(end.getDate()+90);end.setHours(23,59,59,999);
  const events=selected.length?await listEvents(selected,start,end):[];

  const normalized=events.flatMap(e=>{
    const startDate=new Date(e.startDate),endDate=new Date(e.endDate);
    const startMs=startDate.getTime(),endMs=endDate.getTime();
    if(!Number.isFinite(startMs)||!Number.isFinite(endMs)||endMs<startMs){
      console.warn('Skipping invalid calendar event',e.id,e.title,e.startDate,e.endDate);
      return [];
    }
    const storedEndDate=endMs===startMs?new Date(startMs+1000):endDate;
    return [{
      provider:PROVIDER,
      externalId:`${e.calendarId}:${e.id}`,
      title:e.title||'Calendar event',
      startAt:startDate.toISOString(),
      endAt:storedEndDate.toISOString(),
      isAllDay:Boolean(e.allDay),
      lastModifiedAt:e.lastModifiedDate?new Date(e.lastModifiedDate).toISOString():undefined,
    }];
  });

  await replaceExternalCalendarEvents(PROVIDER,start.toISOString(),end.toISOString(),normalized);

  return{calendarNames:selected.map(c=>c.title),eventCount:normalized.length,skippedEventCount:events.length-normalized.length,startAt:start.toISOString(),endAt:end.toISOString()};
}
