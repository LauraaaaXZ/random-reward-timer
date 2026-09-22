import { getDatabase } from './database';
import { GAME_CONFIG } from '../config/gameConfig';
import { randomUUID } from '../utils/id';

export type WeeklyHolidayPass = {weekKey:string;expiresAt:string;extended:boolean;used:boolean;active:boolean};
function isoWeekInfo(now=new Date()){
 const d=new Date(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()));const day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+4-day);const yearStart=new Date(Date.UTC(d.getUTCFullYear(),0,1));const week=Math.ceil((((d.getTime()-yearStart.getTime())/86400000)+1)/7);const weekKey=`${d.getUTCFullYear()}-W${String(week).padStart(2,'0')}`;
 const local=new Date(now);const localDay=local.getDay()||7;const monday=new Date(local);monday.setHours(0,0,0,0);monday.setDate(local.getDate()-(localDay-1));const expiry=new Date(monday);expiry.setDate(expiry.getDate()+7);return{weekKey,expiry};
}
export async function ensureCurrentWeeklyPass(now=new Date()){
 const db=await getDatabase();const{weekKey,expiry}=isoWeekInfo(now);const existing=await db.getFirstAsync<{week_key:string}>('SELECT week_key FROM weekly_holiday_passes WHERE week_key=?',weekKey);if(existing)return false;
 await db.runAsync('INSERT INTO weekly_holiday_passes (week_key,granted_at,expires_at,extended,used_at) VALUES (?,?,?,?,NULL)',weekKey,now.toISOString(),expiry.toISOString(),0);return true;
}
export async function getCurrentWeeklyPass(now=new Date()):Promise<WeeklyHolidayPass>{
 await ensureCurrentWeeklyPass(now);const db=await getDatabase();const{weekKey}=isoWeekInfo(now);const r=await db.getFirstAsync<{week_key:string;expires_at:string;extended:number;used_at:string|null}>('SELECT week_key,expires_at,extended,used_at FROM weekly_holiday_passes WHERE week_key=?',weekKey);if(!r)throw new Error('Weekly Holiday Pass unavailable.');return{weekKey:r.week_key,expiresAt:r.expires_at,extended:Boolean(r.extended),used:Boolean(r.used_at),active:!r.used_at&&new Date(r.expires_at)>now};
}
export async function extendCurrentWeeklyPass(now=new Date()){
 const db=await getDatabase();const pass=await getCurrentWeeklyPass(now);if(pass.used)throw new Error('This weekly pass has already been used.');if(pass.extended)throw new Error('Weekly Holiday Pass can only be extended once.');if(!pass.active)throw new Error('Expired passes cannot be extended.');const cost=GAME_CONFIG.holidayPass.extensionCoinCost;const wallet=await db.getFirstAsync<{coin:number}>('SELECT coin FROM wallet WHERE id=1');if(!wallet||wallet.coin<cost)throw new Error(`Need ${cost} Coin to extend this pass.`);const expiry=new Date(pass.expiresAt);expiry.setDate(expiry.getDate()+7);const ts=now.toISOString();await db.withTransactionAsync(async()=>{await db.runAsync('UPDATE wallet SET coin=coin-?,updated_at=? WHERE id=1',cost,ts);await db.runAsync('UPDATE weekly_holiday_passes SET expires_at=?,extended=1 WHERE week_key=?',expiry.toISOString(),pass.weekKey);await db.runAsync(`INSERT INTO reward_events (id,session_id,source,coin_delta,xp_delta,multiplier,created_at) VALUES (?,NULL,'weekly_holiday_extension',?,0,1,?)`,randomUUID(),-cost,ts);});return getCurrentWeeklyPass(now);
}
export async function consumeWeeklyPass(localDate:string,now=new Date()){
 const db=await getDatabase();const pass=await getCurrentWeeklyPass(now);if(!pass.active)throw new Error('No active Weekly Holiday Pass.');const target=new Date(`${localDate}T00:00:00`);if(Number.isNaN(target.getTime())||target<new Date(now.getFullYear(),now.getMonth(),now.getDate())||target>=new Date(pass.expiresAt))throw new Error('Choose a date before this pass expires.');const ts=now.toISOString();await db.withTransactionAsync(async()=>{await db.runAsync('UPDATE weekly_holiday_passes SET used_at=? WHERE week_key=?',ts,pass.weekKey);await db.runAsync('INSERT INTO holiday_days (local_date,source,created_at) VALUES (?,?,?)',localDate,'pass',ts);});}
