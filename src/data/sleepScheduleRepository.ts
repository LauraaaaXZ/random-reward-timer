import { getDatabase } from './database';
import { randomUUID } from '../utils/id';

export type SleepSchedule={id:string;startTime:string;durationMinutes:480;active:boolean;createdAt:string};
export type SleepSession={localDate:string;actualStartAt:string;actualEndAt:string;confirmedAt:string};

function validateTime(value:string){
  if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value))throw new Error('Use HH:MM.');
}
export async function getSleepSchedule():Promise<SleepSchedule|null>{
  const db=await getDatabase();
  const r=await db.getFirstAsync<{id:string;start_time:string;duration_minutes:number;active:number;created_at:string}>(
    'SELECT id,start_time,duration_minutes,active,created_at FROM sleep_schedules WHERE active=1 ORDER BY created_at DESC LIMIT 1'
  );
  return r?{id:r.id,startTime:r.start_time,durationMinutes:480,active:Boolean(r.active),createdAt:r.created_at}:null;
}
export async function setSleepSchedule(startTime:string){
  validateTime(startTime);
  const db=await getDatabase(),id=randomUUID(),now=new Date().toISOString();
  await db.withTransactionAsync(async()=>{
    await db.runAsync('UPDATE sleep_schedules SET active=0 WHERE active=1');
    await db.runAsync('INSERT INTO sleep_schedules (id,start_time,duration_minutes,active,created_at) VALUES (?,?,480,1,?)',id,startTime,now);
  });
  return id;
}
export async function clearSleepSchedule(){
  const db=await getDatabase();
  await db.runAsync('UPDATE sleep_schedules SET active=0 WHERE active=1');
}
export async function confirmSleepSession(localDate:string,actualStartAt:string,actualEndAt:string){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(localDate))throw new Error('Invalid local date.');
  const start=new Date(actualStartAt),end=new Date(actualEndAt);
  if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start)throw new Error('Wake time must be after actual sleep time.');
  const db=await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO sleep_sessions (local_date,actual_start_at,actual_end_at,confirmed_at) VALUES (?,?,?,?)',
    localDate,start.toISOString(),end.toISOString(),new Date().toISOString()
  );
}
export async function getSleepSession(localDate:string):Promise<SleepSession|null>{
  const db=await getDatabase();
  const r=await db.getFirstAsync<{local_date:string;actual_start_at:string;actual_end_at:string;confirmed_at:string}>(
    'SELECT local_date,actual_start_at,actual_end_at,confirmed_at FROM sleep_sessions WHERE local_date=?',localDate
  );
  return r?{localDate:r.local_date,actualStartAt:r.actual_start_at,actualEndAt:r.actual_end_at,confirmedAt:r.confirmed_at}:null;
}
export async function listSleepSessions(startAt:string,endAt:string):Promise<SleepSession[]>{
  const db=await getDatabase();
  const rows=await db.getAllAsync<{local_date:string;actual_start_at:string;actual_end_at:string;confirmed_at:string}>(
    'SELECT local_date,actual_start_at,actual_end_at,confirmed_at FROM sleep_sessions WHERE actual_end_at > ? AND actual_start_at < ? ORDER BY actual_start_at',
    startAt,endAt
  );
  return rows.map(r=>({localDate:r.local_date,actualStartAt:r.actual_start_at,actualEndAt:r.actual_end_at,confirmedAt:r.confirmed_at}));
}
