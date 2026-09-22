import { getDatabase } from './database';
import { randomUUID } from '../utils/id';

export type SleepSchedule={id:string;startTime:string;durationMinutes:number;active:boolean;createdAt:string};

function validateTime(value:string){
  if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value))throw new Error('Use HH:MM.');
}
export async function getSleepSchedule():Promise<SleepSchedule|null>{
  const db=await getDatabase();
  const r=await db.getFirstAsync<{id:string;start_time:string;duration_minutes:number;active:number;created_at:string}>(
    'SELECT id,start_time,duration_minutes,active,created_at FROM sleep_schedules WHERE active=1 ORDER BY created_at DESC LIMIT 1'
  );
  return r?{id:r.id,startTime:r.start_time,durationMinutes:r.duration_minutes,active:Boolean(r.active),createdAt:r.created_at}:null;
}
export async function setSleepSchedule(startTime:string,durationMinutes:number){
  validateTime(startTime);
  if(!Number.isFinite(durationMinutes)||durationMinutes<240||durationMinutes>720)throw new Error('Sleep duration must be between 4 and 12 hours.');
  const db=await getDatabase(),id=randomUUID(),now=new Date().toISOString();
  await db.withTransactionAsync(async()=>{
    await db.runAsync('UPDATE sleep_schedules SET active=0 WHERE active=1');
    await db.runAsync('INSERT INTO sleep_schedules (id,start_time,duration_minutes,active,created_at) VALUES (?,?,?,1,?)',id,startTime,Math.round(durationMinutes),now);
  });
  return id;
}
export async function clearSleepSchedule(){
  const db=await getDatabase();
  await db.runAsync('UPDATE sleep_schedules SET active=0 WHERE active=1');
}
