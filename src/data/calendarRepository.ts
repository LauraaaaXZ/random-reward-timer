import { getDatabase } from './database';
import { CalendarBlock, CalendarBlockKind } from '../domain/types';
import { randomUUID } from '../utils/id';
import { listMealSchedules } from './mealScheduleRepository';
import { getSleepSchedule, listSleepSessions } from './sleepScheduleRepository';

type CalendarRow={id:string;title:string;start_at:string;end_at:string;kind:CalendarBlockKind};
type ExternalCalendarRow={provider:string;external_id:string;title:string;start_at:string;end_at:string};
type TaskScheduleRow={id:string;task_id:string;task_name:string;start_at:string;end_at:string};

export type ExternalCalendarEventInput={provider:string;externalId:string;title:string;startAt:string;endAt:string;isAllDay?:boolean;lastModifiedAt?:string};
export type CalendarConflict={id:string;title:string;startAt:string;endAt:string;kind:CalendarBlockKind;source:'local'|'external'|'meal'|'sleep'|'task'};

function rowToBlock(r:CalendarRow):CalendarBlock{return{id:r.id,title:r.title,startAt:r.start_at,endAt:r.end_at,kind:r.kind}}
function externalRowToBlock(r:ExternalCalendarRow):CalendarBlock{return{id:`${r.provider}:${r.external_id}`,title:r.title,startAt:r.start_at,endAt:r.end_at,kind:'calendar'}}
function taskRowToBlock(r:TaskScheduleRow):CalendarBlock{return{id:`task:${r.id}`,title:r.task_name,startAt:r.start_at,endAt:r.end_at,kind:'task'}}
function localDateKey(d:Date){return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}

export async function listCalendarBlocks(startAt:string,endAt:string):Promise<CalendarBlock[]>{
  const db=await getDatabase();
  const[localRows,externalRows,taskRows,meals,sleep,sessions]=await Promise.all([
    db.getAllAsync<CalendarRow>('SELECT id,title,start_at,end_at,kind FROM calendar_blocks WHERE end_at > ? AND start_at < ? ORDER BY start_at',startAt,endAt),
    db.getAllAsync<ExternalCalendarRow>('SELECT provider,external_id,title,start_at,end_at FROM external_calendar_events WHERE end_at > ? AND start_at < ? ORDER BY start_at',startAt,endAt),
    db.getAllAsync<TaskScheduleRow>(`SELECT b.id,b.task_id,t.name AS task_name,b.start_at,b.end_at FROM task_schedule_blocks b JOIN tasks t ON t.id=b.task_id WHERE b.end_at>? AND b.start_at<? AND t.status NOT IN ('archived','completed') ORDER BY b.start_at`,startAt,endAt),
    listMealSchedules(),
    getSleepSchedule(),
    listSleepSessions(startAt,endAt),
  ]);
  const rs=new Date(startAt),re=new Date(endAt);
  const mealBlocks=meals.filter(m=>new Date(m.endAt)>rs&&new Date(m.startAt)<re).map<CalendarBlock>(m=>({id:`meal:${m.id}`,title:m.label,startAt:m.startAt,endAt:m.endAt,kind:'meal'}));
  const sleepBlocks:CalendarBlock[]=sessions.map(x=>({id:`sleep-actual:${x.localDate}`,title:'Sleep · actual',startAt:x.actualStartAt,endAt:x.actualEndAt,kind:'sleep'}));
  if(sleep){
    const cursor=new Date(rs);cursor.setHours(0,0,0,0);cursor.setDate(cursor.getDate()-1);
    const confirmed=new Set(sessions.map(x=>x.localDate));
    while(cursor<re){
      const day=localDateKey(cursor);
      if(!confirmed.has(day)){
        const s=new Date(`${day}T${sleep.startTime}:00`),e=new Date(s.getTime()+480*60000);
        if(e>rs&&s<re)sleepBlocks.push({id:`sleep:${sleep.id}:${day}`,title:'Sleep · planned 8h',startAt:s.toISOString(),endAt:e.toISOString(),kind:'sleep'});
      }
      cursor.setDate(cursor.getDate()+1);
    }
  }
  return[
    ...localRows.map(rowToBlock),
    ...externalRows.map(externalRowToBlock),
    ...taskRows.map(taskRowToBlock),
    ...mealBlocks,
    ...sleepBlocks,
  ].sort((a,b)=>+new Date(a.startAt)-+new Date(b.startAt));
}

export async function findCalendarConflicts(startAt:string,endAt:string):Promise<CalendarConflict[]>{
  const blocks=await listCalendarBlocks(startAt,endAt);
  return blocks.map(b=>({
    id:b.id,title:b.title,startAt:b.startAt,endAt:b.endAt,kind:b.kind,
    source:b.kind==='meal'?'meal':b.kind==='sleep'?'sleep':b.kind==='task'?'task':b.id.includes(':')?'external':'local'
  }));
}

export async function addCalendarBlock(input:{title:string;startAt:string;endAt:string;kind?:Exclude<CalendarBlockKind,'task'>}){
  if(+new Date(input.endAt)<=+new Date(input.startAt))throw new Error('Calendar block must end after it starts.');
  const conflicts=await findCalendarConflicts(input.startAt,input.endAt);
  if(conflicts.length){const e=new Error('TIME_CONFLICT')as Error&{conflicts?:CalendarConflict[]};e.conflicts=conflicts;throw e}
  const db=await getDatabase(),id=randomUUID();
  await db.runAsync('INSERT INTO calendar_blocks (id,title,start_at,end_at,kind) VALUES (?,?,?,?,?)',id,input.title.trim(),input.startAt,input.endAt,input.kind??'calendar');
  return id;
}

export async function removeCalendarBlock(id:string){
  const db=await getDatabase();
  await db.runAsync('DELETE FROM calendar_blocks WHERE id=?',id);
}

export async function replaceExternalCalendarEvents(provider:string,startAt:string,endAt:string,events:ExternalCalendarEventInput[]){
  const db=await getDatabase(),syncedAt=new Date().toISOString();
  await db.withTransactionAsync(async()=>{
    await db.runAsync('DELETE FROM external_calendar_events WHERE provider=? AND end_at>? AND start_at<?',provider,startAt,endAt);
    for(const e of events)await db.runAsync('INSERT OR REPLACE INTO external_calendar_events (provider,external_id,title,start_at,end_at,is_all_day,last_modified_at,synced_at) VALUES (?,?,?,?,?,?,?,?)',e.provider,e.externalId,e.title,e.startAt,e.endAt,e.isAllDay?1:0,e.lastModifiedAt??null,syncedAt);
  });
}
