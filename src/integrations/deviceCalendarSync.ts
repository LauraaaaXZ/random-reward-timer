import * as Calendar from 'expo-calendar/legacy';
import { replaceExternalCalendarEvents } from '../data/calendarRepository';

export const DEVICE_CALENDAR_PROVIDER='android-system-calendar';
export const INCLUDED_DEVICE_CALENDARS=['日历','courses','MAIB7001','MAIB7002','MAIB7003','MAIB7005','boxing','tennis SmartPlay'] as const;
const INCLUDED=new Set<string>(INCLUDED_DEVICE_CALENDARS);

export type DeviceCalendarSyncResult={status:'synced'|'denied';calendarNames:string[];eventCount:number;startAt:string;endAt:string};

export async function syncDeviceCalendars(now=new Date()):Promise<DeviceCalendarSyncResult>{
  const permission=await Calendar.getCalendarPermissionsAsync();
  const granted=permission.status==='granted'?permission:await Calendar.requestCalendarPermissionsAsync();
  const start=new Date(now);start.setDate(start.getDate()-7);start.setHours(0,0,0,0);
  const end=new Date(now);end.setDate(end.getDate()+90);end.setHours(23,59,59,999);
  if(granted.status!=='granted')return{status:'denied',calendarNames:[],eventCount:0,startAt:start.toISOString(),endAt:end.toISOString()};
  const calendars=await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const selected=calendars.filter(c=>INCLUDED.has(c.title));
  const events=selected.length?await Calendar.getEventsAsync(selected.map(c=>c.id),start,end):[];
  const selectedById=new Map(selected.map(c=>[c.id,c.title]));
  const normalized=events.filter(e=>e.startDate&&e.endDate).map(e=>({
    provider:DEVICE_CALENDAR_PROVIDER,
    externalId:`${e.calendarId}:${e.id}:${new Date(e.startDate).toISOString()}`,
    title:e.title?.trim()||selectedById.get(e.calendarId)||'Calendar event',
    startAt:new Date(e.startDate).toISOString(),
    endAt:new Date(e.endDate).toISOString(),
    isAllDay:Boolean(e.allDay),
    lastModifiedAt:e.lastModifiedDate?new Date(e.lastModifiedDate).toISOString():undefined,
  }));
  await replaceExternalCalendarEvents(DEVICE_CALENDAR_PROVIDER,start.toISOString(),end.toISOString(),normalized);
  return{status:'synced',calendarNames:selected.map(c=>c.title),eventCount:normalized.length,startAt:start.toISOString(),endAt:end.toISOString()};
}
