import { getDatabase } from './database';
import { randomUUID } from '../utils/id';

export type MealSchedule={id:string;label:string;startTime:string;durationMinutes:60;active:boolean;createdAt:string};

function validateTime(value:string){
  if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value))throw new Error('Use HH:MM.');
}
export async function listMealSchedules():Promise<MealSchedule[]>{
  const db=await getDatabase();
  const rows=await db.getAllAsync<{id:string;label:string;start_time:string;duration_minutes:number;active:number;created_at:string}>(
    'SELECT id,label,start_time,duration_minutes,active,created_at FROM meal_schedules WHERE active=1 ORDER BY start_time'
  );
  return rows.map(r=>({id:r.id,label:r.label,startTime:r.start_time,durationMinutes:60,active:Boolean(r.active),createdAt:r.created_at}));
}
export async function createMealSchedule(label:string,startTime:string){
  validateTime(startTime);
  const name=label.trim()||'Meal';
  const db=await getDatabase();
  const count=await db.getFirstAsync<{n:number}>('SELECT COUNT(*) AS n FROM meal_schedules WHERE active=1');
  if((count?.n??0)>=4)throw new Error('Maximum 4 active meal blocks per day.');
  const id=randomUUID();
  await db.runAsync(
    'INSERT INTO meal_schedules (id,label,start_time,duration_minutes,active,created_at) VALUES (?,?,?,60,1,?)',
    id,name,startTime,new Date().toISOString()
  );
  return id;
}
export async function archiveMealSchedule(id:string){
  const db=await getDatabase();
  await db.runAsync('UPDATE meal_schedules SET active=0 WHERE id=?',id);
}
