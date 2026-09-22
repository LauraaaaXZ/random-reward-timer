import { getDatabase } from './database';
import { GAME_CONFIG } from '../config/gameConfig';
import { randomUUID } from '../utils/id';

export type RestState={
  restMinutes:number;
  restEndsAt:string;
  nextDrawAt:string;
  chosen:boolean;
  active:boolean;
};

async function ensureTable(){
  const db=await getDatabase();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS rest_schedule (
      id INTEGER PRIMARY KEY CHECK(id=1),
      rest_minutes INTEGER NOT NULL DEFAULT 0,
      rest_started_at TEXT,
      rest_ends_at TEXT,
      next_draw_at TEXT,
      chosen INTEGER NOT NULL DEFAULT 0 CHECK(chosen IN (0,1)),
      updated_at TEXT NOT NULL
    );
    INSERT OR IGNORE INTO rest_schedule
      (id,rest_minutes,rest_started_at,rest_ends_at,next_draw_at,chosen,updated_at)
    VALUES (1,0,NULL,NULL,NULL,0,datetime('now'));
  `);
}

function randomRestMinutes(random=Math.random){
  const options=GAME_CONFIG.mandatoryRest.optionsMinutes;
  return options[Math.floor(random()*options.length)] ?? options[0];
}

export async function startRandomRest(random=Math.random,now=new Date()){
  await ensureTable();
  return setRest(randomRestMinutes(random),false,now);
}

async function setRest(minutes:number,chosen:boolean,now=new Date()){
  const db=await getDatabase();
  const end=new Date(now.getTime()+minutes*60000);
  await db.runAsync(
    'UPDATE rest_schedule SET rest_minutes=?,rest_started_at=?,rest_ends_at=?,next_draw_at=?,chosen=?,updated_at=? WHERE id=1',
    minutes,now.toISOString(),end.toISOString(),end.toISOString(),chosen?1:0,now.toISOString(),
  );
  return getRestState(now);
}

export async function chooseRestWithCoin(minutes:number,now=new Date()){
  if(!GAME_CONFIG.mandatoryRest.optionsMinutes.includes(minutes as any))throw new Error('Choose 5, 10, 15, or 30 minutes.');
  await ensureTable();const db=await getDatabase();const cost=GAME_CONFIG.mandatoryRest.chooseCoinCost;
  const wallet=await db.getFirstAsync<{coin:number}>('SELECT coin FROM wallet WHERE id=1');
  if(!wallet||wallet.coin<cost)throw new Error(`Need ${cost} Coin to choose rest time.`);
  const end=new Date(now.getTime()+minutes*60000),ts=now.toISOString();
  await db.withTransactionAsync(async()=>{
    await db.runAsync('UPDATE wallet SET coin=coin-?,updated_at=? WHERE id=1',cost,ts);
    await db.runAsync('UPDATE rest_schedule SET rest_minutes=?,rest_started_at=?,rest_ends_at=?,next_draw_at=?,chosen=1,updated_at=? WHERE id=1',minutes,ts,end.toISOString(),end.toISOString(),ts);
    await db.runAsync(`INSERT INTO reward_events (id,session_id,source,coin_delta,xp_delta,multiplier,created_at) VALUES (?,NULL,'choose_rest_time',?,0,1,?)`,randomUUID(),-cost,ts);
  });
  return getRestState(now);
}

export async function scheduleNextDrawAfter(delayMinutes:number,now=new Date()){
  if(!Number.isFinite(delayMinutes)||delayMinutes<0)throw new Error('Delay must be nonnegative.');
  await ensureTable();const db=await getDatabase();
  const row=await db.getFirstAsync<{rest_ends_at:string|null}>('SELECT rest_ends_at FROM rest_schedule WHERE id=1');
  const restEnd=row?.rest_ends_at?new Date(row.rest_ends_at):now;
  const base=restEnd>now?restEnd:now;
  const next=new Date(base.getTime()+Math.round(delayMinutes)*60000);
  await db.runAsync('UPDATE rest_schedule SET next_draw_at=?,updated_at=? WHERE id=1',next.toISOString(),now.toISOString());
  return getRestState(now);
}

export async function getRestState(now=new Date()):Promise<RestState|null>{
  await ensureTable();const db=await getDatabase();
  const row=await db.getFirstAsync<{rest_minutes:number;rest_ends_at:string|null;next_draw_at:string|null;chosen:number}>('SELECT rest_minutes,rest_ends_at,next_draw_at,chosen FROM rest_schedule WHERE id=1');
  if(!row?.next_draw_at||!row.rest_ends_at)return null;
  return{restMinutes:row.rest_minutes,restEndsAt:row.rest_ends_at,nextDrawAt:row.next_draw_at,chosen:Boolean(row.chosen),active:new Date(row.next_draw_at)>now};
}

export async function clearExpiredRest(now=new Date()){
  await ensureTable();const state=await getRestState(now);
  if(!state||state.active)return false;
  const db=await getDatabase();await db.runAsync('UPDATE rest_schedule SET rest_minutes=0,rest_started_at=NULL,rest_ends_at=NULL,next_draw_at=NULL,chosen=0,updated_at=? WHERE id=1',now.toISOString());
  return true;
}
