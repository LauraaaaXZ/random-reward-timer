import { getDatabase } from '../data/database';
import { listCalendarBlocks } from '../data/calendarRepository';
import { isHoliday } from '../data/holidayRepository';
import { chargeAnnualLeaveForWorkShortfall } from '../data/leaveRepository';

export type DailyWorkCapacity = {
  localDate: string;
  disposableMinutes: number;
  minimumMinutes: number;
  maximumMinutes: number;
  creditedWorkMinutes: number;
  remainingToMinimum: number;
  remainingToMaximum: number;
  minimumMet: boolean;
  maximumReached: boolean;
  configured: boolean;
};

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function dayBounds(localDate:string){
  const start=new Date(`${localDate}T00:00:00`);
  const end=new Date(start); end.setDate(end.getDate()+1);
  return {start,end};
}
function mergedBlockedMinutes(blocks:{startAt:string;endAt:string}[],start:Date,end:Date){
  const ranges=blocks.map(b=>[
    Math.max(start.getTime(),new Date(b.startAt).getTime()),
    Math.min(end.getTime(),new Date(b.endAt).getTime())
  ] as const).filter(([s,e])=>e>s).sort((a,b)=>a[0]-b[0]);
  let total=0,cursorStart=-1,cursorEnd=-1;
  for(const [s,e] of ranges){
    if(cursorStart<0){cursorStart=s;cursorEnd=e;continue}
    if(s<=cursorEnd){cursorEnd=Math.max(cursorEnd,e);continue}
    total+=cursorEnd-cursorStart;cursorStart=s;cursorEnd=e;
  }
  if(cursorStart>=0)total+=cursorEnd-cursorStart;
  return Math.round(total/60000);
}
export async function getDailyWorkCapacity(date=new Date()):Promise<DailyWorkCapacity>{
  const localDate=localDateKey(date),{start,end}=dayBounds(localDate);
  const holiday=await isHoliday(localDate);
  const blocks=await listCalendarBlocks(start.toISOString(),end.toISOString());
  const mealCount=blocks.filter(b=>b.kind==='meal').length;
  const configured=blocks.some(b=>b.kind==='sleep')&&mealCount>=2;
  const blocked=mergedBlockedMinutes(blocks,start,end);
  const disposableMinutes=Math.max(0,1440-blocked);
  const minimumMinutes=holiday?0:disposableMinutes*.25;
  const maximumMinutes=holiday?0:disposableMinutes*.5;
  const db=await getDatabase();
  const row=await db.getFirstAsync<{credited:number|null}>(`
    SELECT SUM(COALESCE(s.actual_minutes,0)*COALESCE(m.credit_ratio,1)) AS credited
    FROM focus_sessions s
    LEFT JOIN focus_session_modes m ON m.session_id=s.id
    WHERE s.ended_at IS NOT NULL AND s.started_at>=? AND s.started_at<?
  `,start.toISOString(),end.toISOString());
  const creditedWorkMinutes=Number(row?.credited??0);
  return{
    localDate,disposableMinutes,minimumMinutes,maximumMinutes,creditedWorkMinutes,
    remainingToMinimum:Math.max(0,minimumMinutes-creditedWorkMinutes),
    remainingToMaximum:Math.max(0,maximumMinutes-creditedWorkMinutes),
    minimumMet:creditedWorkMinutes>=minimumMinutes,
    maximumReached:maximumMinutes>0&&creditedWorkMinutes>=maximumMinutes,
    configured,
  };
}
export async function settleDailyWorkShortfall(localDate:string){
  const db=await getDatabase();
  const existing=await db.getFirstAsync<{local_date:string}>('SELECT local_date FROM daily_work_settlements WHERE local_date=?',localDate);
  if(existing)return null;
  const capacity=await getDailyWorkCapacity(new Date(`${localDate}T12:00:00`));
  if(!capacity.configured)return null;
  const shortfallMinutes=Math.max(0,capacity.minimumMinutes-capacity.creditedWorkMinutes);
  const charged=shortfallMinutes>0?await chargeAnnualLeaveForWorkShortfall(localDate,shortfallMinutes):0;
  await db.runAsync(`
    INSERT INTO daily_work_settlements
    (local_date,disposable_minutes,minimum_minutes,maximum_minutes,credited_work_minutes,shortfall_minutes,leave_days_charged,settled_at)
    VALUES (?,?,?,?,?,?,?,?)
  `,localDate,capacity.disposableMinutes,capacity.minimumMinutes,capacity.maximumMinutes,capacity.creditedWorkMinutes,shortfallMinutes,charged,new Date().toISOString());
  return{...capacity,shortfallMinutes,leaveDaysCharged:charged};
}
export async function settlePreviousDayWorkShortfall(now=new Date()){
  const d=new Date(now);d.setDate(d.getDate()-1);
  return settleDailyWorkShortfall(localDateKey(d));
}
