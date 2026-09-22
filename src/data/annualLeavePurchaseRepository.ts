import { getDatabase } from './database';
import { GAME_CONFIG } from '../config/gameConfig';
import { grantAnnualLeaveMinutes } from './leaveRepository';
import { randomUUID } from '../utils/id';

export async function getAnnualLeavePurchaseQuote(){
 const db=await getDatabase();await db.execAsync(`CREATE TABLE IF NOT EXISTS annual_leave_purchases (id TEXT PRIMARY KEY NOT NULL,minutes INTEGER NOT NULL,coin_cost INTEGER NOT NULL,purchased_at TEXT NOT NULL);`);
 const row=await db.getFirstAsync<{n:number}>('SELECT COUNT(*) AS n FROM annual_leave_purchases');const purchaseNumber=(row?.n??0)+1;
 const {baseCoinCost,priceGrowth,unitMinutes}=GAME_CONFIG.annualLeavePurchase;const coinCost=Math.ceil(baseCoinCost*Math.pow(priceGrowth,purchaseNumber-1));
 return{purchaseNumber,minutes:unitMinutes,days:unitMinutes/GAME_CONFIG.annualLeaveMinutesPerDay,coinCost};
}
export async function purchasePermanentAnnualLeave(){
 const db=await getDatabase();const quote=await getAnnualLeavePurchaseQuote();const wallet=await db.getFirstAsync<{coin:number}>('SELECT coin FROM wallet WHERE id=1');if(!wallet||wallet.coin<quote.coinCost)throw new Error(`Need ${quote.coinCost} Coin.`);const now=new Date().toISOString();
 await db.withTransactionAsync(async()=>{await db.runAsync('UPDATE wallet SET coin=coin-?,updated_at=? WHERE id=1',quote.coinCost,now);await db.runAsync('INSERT INTO annual_leave_purchases (id,minutes,coin_cost,purchased_at) VALUES (?,?,?,?)',randomUUID(),quote.minutes,quote.coinCost,now);await grantAnnualLeaveMinutes(quote.minutes);await db.runAsync(`INSERT INTO reward_events (id,session_id,source,coin_delta,xp_delta,multiplier,created_at) VALUES (?,NULL,'annual_leave_purchase',?,0,1,?)`,randomUUID(),-quote.coinCost,now);});return quote;
}
