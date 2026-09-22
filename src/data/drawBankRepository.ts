import { getDatabase } from './database';
import { RewardPool } from '../engine/rewardPools';

async function ensureTable(){
 const db=await getDatabase();
 await db.execAsync(`
  CREATE TABLE IF NOT EXISTS draw_wallet (
   id INTEGER PRIMARY KEY CHECK(id=1),
   balance REAL NOT NULL DEFAULT 0,
   spent_draws INTEGER NOT NULL DEFAULT 0,
   updated_at TEXT NOT NULL
  );
  INSERT OR IGNORE INTO draw_wallet(id,balance,spent_draws,updated_at) VALUES (1,0,0,datetime('now'));
  CREATE TABLE IF NOT EXISTS draw_pool_spend (
   pool TEXT PRIMARY KEY NOT NULL CHECK(pool IN ('time','function')),
   spent_draws INTEGER NOT NULL DEFAULT 0,
   updated_at TEXT NOT NULL
  );
  INSERT OR IGNORE INTO draw_pool_spend(pool,spent_draws,updated_at) VALUES ('time',0,datetime('now'));
  INSERT OR IGNORE INTO draw_pool_spend(pool,spent_draws,updated_at) VALUES ('function',0,datetime('now'));
  CREATE TABLE IF NOT EXISTS draw_credit_events (
   source_key TEXT PRIMARY KEY NOT NULL,
   amount REAL NOT NULL,
   created_at TEXT NOT NULL
  );
 `);
}
export async function addDrawProgress(amount:number,sourceKey?:string){
 if(amount<=0)return false;
 await ensureTable();const db=await getDatabase(),now=new Date().toISOString();
 if(!sourceKey){await db.runAsync('UPDATE draw_wallet SET balance=balance+?,updated_at=? WHERE id=1',amount,now);return true;}
 let added=false;
 await db.withTransactionAsync(async()=>{
  const existing=await db.getFirstAsync<{source_key:string}>('SELECT source_key FROM draw_credit_events WHERE source_key=?',sourceKey);
  if(existing)return;
  await db.runAsync('INSERT INTO draw_credit_events(source_key,amount,created_at) VALUES (?,?,?)',sourceKey,amount,now);
  await db.runAsync('UPDATE draw_wallet SET balance=balance+?,updated_at=? WHERE id=1',amount,now);
  added=true;
 });
 return added;
}
export async function getDrawBank(){
 await ensureTable();const db=await getDatabase();
 const wallet=await db.getFirstAsync<{balance:number;spent_draws:number}>('SELECT balance,spent_draws FROM draw_wallet WHERE id=1');
 const rows=await db.getAllAsync<{pool:RewardPool;spent_draws:number}>('SELECT pool,spent_draws FROM draw_pool_spend');
 const spentByPool:any={time:0,function:0};for(const r of rows)spentByPool[r.pool]=r.spent_draws;
 const balance=wallet?.balance??0;
 return{balance,availableDraws:Math.floor(balance),tenDrawReady:Math.floor(balance)>=10,spentDraws:wallet?.spent_draws??0,spentByPool};
}
export async function spendDraws(pool:RewardPool,count:number){
 await ensureTable();const db=await getDatabase();const bank=await getDrawBank();
 if(count<=0||bank.balance<count)throw new Error('Not enough banked draws.');
 const now=new Date().toISOString();
 await db.withTransactionAsync(async()=>{
  await db.runAsync('UPDATE draw_wallet SET balance=balance-?,spent_draws=spent_draws+?,updated_at=? WHERE id=1',count,count,now);
  await db.runAsync('UPDATE draw_pool_spend SET spent_draws=spent_draws+?,updated_at=? WHERE pool=?',count,now,pool);
 });
 return getDrawBank();
}
