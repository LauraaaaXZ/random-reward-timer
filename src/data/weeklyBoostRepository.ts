import { getDatabase } from './database';
import { randomUUID } from '../utils/id';

export type WeeklyBoostType='discount'|'limit_plus_one';
export type WeeklyBoost={id:string;type:WeeklyBoostType;discountRate:number|null;expiresAt:string;used:boolean};

async function ensureTable(){const db=await getDatabase();await db.execAsync(`CREATE TABLE IF NOT EXISTS weekly_boost_coupons (id TEXT PRIMARY KEY NOT NULL,type TEXT NOT NULL CHECK(type IN ('discount','limit_plus_one')),discount_rate REAL,issued_at TEXT NOT NULL,expires_at TEXT NOT NULL,used_at TEXT);`);}
export async function grantWeeklyBoost(type:WeeklyBoostType,discountRate=.25,now=new Date()){
 await ensureTable();const db=await getDatabase();const expiry=new Date(now);expiry.setDate(expiry.getDate()+7);const id=randomUUID();await db.runAsync('INSERT INTO weekly_boost_coupons (id,type,discount_rate,issued_at,expires_at,used_at) VALUES (?,?,?,?,?,NULL)',id,type,type==='discount'?discountRate:null,now.toISOString(),expiry.toISOString());return id;
}
export async function listActiveWeeklyBoosts(now=new Date()):Promise<WeeklyBoost[]>{
 await ensureTable();const db=await getDatabase();const rows=await db.getAllAsync<{id:string;type:WeeklyBoostType;discount_rate:number|null;expires_at:string;used_at:string|null}>('SELECT id,type,discount_rate,expires_at,used_at FROM weekly_boost_coupons WHERE used_at IS NULL AND expires_at>? ORDER BY expires_at',now.toISOString());return rows.map(r=>({id:r.id,type:r.type,discountRate:r.discount_rate,expiresAt:r.expires_at,used:false}));
}
export async function consumeWeeklyBoost(id:string,now=new Date()){
 await ensureTable();const db=await getDatabase();const row=await db.getFirstAsync<{expires_at:string;used_at:string|null}>('SELECT expires_at,used_at FROM weekly_boost_coupons WHERE id=?',id);if(!row||row.used_at||new Date(row.expires_at)<=now)throw new Error('Coupon is unavailable or expired.');await db.runAsync('UPDATE weekly_boost_coupons SET used_at=? WHERE id=?',now.toISOString(),id);
}
