import{getDatabase}from'./database';
import{randomUUID}from'../utils/id';
import{findCalendarConflicts}from'./calendarRepository';

export type TaskScheduleBlock={id:string;taskId:string;taskName:string;startAt:string;endAt:string};

export async function listTaskScheduleBlocks(startAt:string,endAt:string):Promise<TaskScheduleBlock[]>{
  const db=await getDatabase();
  return db.getAllAsync<TaskScheduleBlock>(`SELECT b.id,b.task_id AS taskId,t.name AS taskName,b.start_at AS startAt,b.end_at AS endAt FROM task_schedule_blocks b JOIN tasks t ON t.id=b.task_id WHERE b.end_at>? AND b.start_at<? AND t.status NOT IN ('archived','completed') ORDER BY b.start_at`,startAt,endAt);
}

export async function scheduleTask(taskId:string,startAt:string,endAt:string){
  if(new Date(endAt)<=new Date(startAt))throw new Error('End time must be after start time.');
  const conflicts=await findCalendarConflicts(startAt,endAt);
  if(conflicts.length)throw new Error(`TIME_CONFLICT:${conflicts[0]?.title??'existing block'}`);
  const db=await getDatabase(),id=randomUUID();
  await db.runAsync('INSERT INTO task_schedule_blocks (id,task_id,start_at,end_at,created_at) VALUES (?,?,?,?,?)',id,taskId,startAt,endAt,new Date().toISOString());
  return id;
}

export async function unscheduleTaskBlock(id:string){
  const db=await getDatabase();
  await db.runAsync('DELETE FROM task_schedule_blocks WHERE id=?',id);
}
