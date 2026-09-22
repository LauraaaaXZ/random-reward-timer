import { getDatabase } from './database';
import { addHolidayPass, isHoliday } from './holidayRepository';

export type LeaveBalance = {
  year: number;
  baseDays: number;
  levelBonusDays: number;
  compDays: number;
  usedDays: number;
  availableDays: number;
};

function localDateKey(date = new Date()) {
  const y=date.getFullYear(); const m=String(date.getMonth()+1).padStart(2,'0'); const d=String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}

function isoWeekKey(date = new Date()) {
  const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));
  const day=d.getUTCDay()||7; d.setUTCDate(d.getUTCDate()+4-day);
  const yearStart=new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const week=Math.ceil((((d.getTime()-yearStart.getTime())/86400000)+1)/7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2,'0')}`;
}

async function ensureYear(year:number){
  const db=await getDatabase();
  await db.runAsync(
    `INSERT OR IGNORE INTO annual_leave_accounts
     (year,base_days,level_bonus_days,comp_days,used_days,updated_at)
     VALUES (?,20,0,0,0,?)`, year,new Date().toISOString(),
  );
}

export async function ensureWeeklyHolidayPass(now=new Date()){
  const db=await getDatabase(); const key=isoWeekKey(now); const grantedAt=new Date().toISOString();
  const existing=await db.getFirstAsync<{week_key:string}>('SELECT week_key FROM weekly_holiday_grants WHERE week_key = ?',key);
  if(existing)return false;
  await db.withTransactionAsync(async()=>{
    await db.runAsync('INSERT INTO weekly_holiday_grants (week_key,granted_at) VALUES (?,?)',key,grantedAt);
    await addHolidayPass(1);
  });
  return true;
}

export async function syncLevelAnnualLeaveBonus(level:number,year=new Date().getFullYear()){
  await ensureYear(year); const db=await getDatabase(); const now=new Date().toISOString();
  const rows=await db.getAllAsync<{level:number}>('SELECT level FROM annual_leave_level_awards');
  const awarded=new Set(rows.map(r=>r.level));
  const newLevels:number[]=[];
  for(let lv=2;lv<=level;lv++)if(!awarded.has(lv))newLevels.push(lv);
  if(!newLevels.length)return 0;
  await db.withTransactionAsync(async()=>{
    for(const lv of newLevels)await db.runAsync('INSERT INTO annual_leave_level_awards (level,awarded_at) VALUES (?,?)',lv,now);
    await db.runAsync('UPDATE annual_leave_accounts SET level_bonus_days=level_bonus_days+?,updated_at=? WHERE year=?',newLevels.length*0.1,now,year);
  });
  return newLevels.length*0.1;
}

export async function getLeaveBalance(year=new Date().getFullYear()):Promise<LeaveBalance>{
  await ensureYear(year); const db=await getDatabase();
  const r=await db.getFirstAsync<{base_days:number;level_bonus_days:number;comp_days:number;used_days:number}>('SELECT base_days,level_bonus_days,comp_days,used_days FROM annual_leave_accounts WHERE year=?',year);
  const baseDays=r?.base_days??20,levelBonusDays=r?.level_bonus_days??0,compDays=r?.comp_days??0,usedDays=r?.used_days??0;
  return{year,baseDays,levelBonusDays,compDays,usedDays,availableDays:baseDays+levelBonusDays+compDays-usedDays};
}

export async function useAnnualLeave(localDate:string,days=1){
  const year=Number(localDate.slice(0,4)); await ensureYear(year); const db=await getDatabase(); const balance=await getLeaveBalance(year);
  if(days<=0||days>balance.availableDays)throw new Error('Not enough annual leave balance.');
  if(await isHoliday(localDate))throw new Error('This date is already a holiday.');
  const now=new Date().toISOString();
  await db.withTransactionAsync(async()=>{
    await db.runAsync('UPDATE annual_leave_accounts SET used_days=used_days+?,updated_at=? WHERE year=?',days,now,year);
    await db.runAsync('INSERT INTO holiday_days (local_date,source,created_at) VALUES (?,?,?)',localDate,'annual_leave',now);
  });
}

export async function recordHolidayWork(workedMinutes:number,localDate=localDateKey()){
  if(workedMinutes<=0)return 0;
  if(!(await isHoliday(localDate)))return 0;
  const year=Number(localDate.slice(0,4)); await ensureYear(year); const db=await getDatabase(); const now=new Date().toISOString();
  // 8 hours of holiday work = 1 compensatory day; partial work accrues fractionally.
  const compDays=workedMinutes/480;
  await db.withTransactionAsync(async()=>{
    await db.runAsync(
      `INSERT INTO holiday_work_log (local_date,worked_minutes,comp_days_awarded,updated_at)
       VALUES (?,?,?,?)
       ON CONFLICT(local_date) DO UPDATE SET worked_minutes=worked_minutes+excluded.worked_minutes,
       comp_days_awarded=comp_days_awarded+excluded.comp_days_awarded,updated_at=excluded.updated_at`,
      localDate,workedMinutes,compDays,now,
    );
    await db.runAsync('UPDATE annual_leave_accounts SET comp_days=comp_days+?,updated_at=? WHERE year=?',compDays,now,year);
  });
  return compDays;
}
