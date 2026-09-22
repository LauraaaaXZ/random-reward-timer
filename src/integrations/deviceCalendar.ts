import {Calendar} from 'expo-calendar';
import {replaceExternalCalendarEvents} from '../data/calendarRepository';

export const DEVICE_CALENDAR_NAMES=['日历','courses','MAIB7001','MAIB7002','MAIB7003','MAIB7005','boxing','tennis SmartPlay'] as const;
const INCLUDED=new Set<string>(DEVICE_CALENDAR_NAMES);
const PROVIDER='device-calendar';

export type DeviceCalendarSyncResult={calendarNames:string[];eventCount:number;startAt:string;endAt:string};

export async function syncDeviceCalendars(now=new Date()):Promise<DeviceCalendarSyncResult>{
  const permission=await Calendar.requestPermissions();
  if(permission.status!=='granted')throw new Error('Calendar permission is required to sync Outlook events from your phone.');
  const calendars=await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  const selected=calendars.filter(c=>INCLUDED.has(c.title));
  const start=new Date(now);start.setDate(start.getDate()-7);start.setHours(0,0,0,0);
  const end=new Date(now);end.setDate(end.getDate()+90);end.setHours(23,59,59,999);
  const events=selected.length?await Calendar.getEvents(selected.map(c=>c.id),start,end):[];
  await replaceExternalCalendarEvents(PROVIDER,start.toISOString(),end.toISOString(),events.map(e=>({
    provider:PROVIDER,
    externalId:`${e.calendarId}:${e.id}`,
    title:e.title||'Calendar event',
    startAt:new Date(e.startDate).toISOString(),
    endAt:new Date(e.endDate).toISOString(),
    isAllDay:Boolean(e.allDay),
    lastModifiedAt:e.lastModifiedDate?new Date(e.lastModifiedDate).toISOString():undefined,
  })));
  return{calendarNames:selected.map(c=>c.title),eventCount:events.length,startAt:start.toISOString(),endAt:end.toISOString()};
}
