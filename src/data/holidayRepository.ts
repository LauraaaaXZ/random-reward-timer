import { getDatabase } from './database';
import { GAME_CONFIG } from '../config/gameConfig';
import { randomUUID } from '../utils/id';
import { getFixedHoliday, listUpcomingFixedHolidays } from '../config/fixedHolidays';

export type HolidayDay = {
  localDate: string;
  source: 'pass' | 'draw' | 'grant' | 'fixed' | 'annual_leave' | 'comp_leave';
  createdAt: string;
  name?: string;
};

function validLocalDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

export async function getHolidayPassCount() {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ quantity: number }>('SELECT quantity FROM inventory WHERE resource_key = ?','holiday_pass');
  return row?.quantity ?? 0;
}

export async function addHolidayPass(quantity = 1) {
  if (quantity <= 0) return getHolidayPassCount();
  const db = await getDatabase(); const now = new Date().toISOString();
  await db.runAsync(`INSERT INTO inventory (resource_key, quantity, updated_at) VALUES ('holiday_pass', ?, ?)
     ON CONFLICT(resource_key) DO UPDATE SET quantity = quantity + excluded.quantity, updated_at = excluded.updated_at`,quantity,now);
  return getHolidayPassCount();
}

export async function redeemHolidayPassWithCoin() {
  const db = await getDatabase(); const cost = GAME_CONFIG.holidayPass.coinCost; const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    const wallet = await db.getFirstAsync<{ coin: number }>('SELECT coin FROM wallet WHERE id = 1');
    if (!wallet || wallet.coin < cost) throw new Error(`Need ${cost} Coin for a Holiday Pass.`);
    await db.runAsync('UPDATE wallet SET coin = coin - ?, updated_at = ? WHERE id = 1',cost,now);
    await db.runAsync(`INSERT INTO inventory (resource_key, quantity, updated_at) VALUES ('holiday_pass', 1, ?)
       ON CONFLICT(resource_key) DO UPDATE SET quantity = quantity + 1, updated_at = excluded.updated_at`,now);
    await db.runAsync(`INSERT INTO reward_events (id, session_id, source, coin_delta, xp_delta, multiplier, created_at)
       VALUES (?, NULL, 'holiday_pass_exchange', ?, 0, 1, ?)`,randomUUID(),-cost,now);
  });
  return getHolidayPassCount();
}

export async function scheduleHoliday(localDate: string) {
  if (!validLocalDate(localDate)) throw new Error('Use date format YYYY-MM-DD.');
  const db = await getDatabase(); const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    const existing = await db.getFirstAsync<{ local_date: string }>('SELECT local_date FROM holiday_days WHERE local_date = ?',localDate);
    if (existing || getFixedHoliday(localDate)) return;
    const pass = await db.getFirstAsync<{ quantity: number }>('SELECT quantity FROM inventory WHERE resource_key = ?','holiday_pass');
    if (!pass || pass.quantity < 1) throw new Error('No Holiday Pass available.');
    await db.runAsync('UPDATE inventory SET quantity = quantity - 1, updated_at = ? WHERE resource_key = ?',now,'holiday_pass');
    await db.runAsync('INSERT INTO holiday_days (local_date, source, created_at) VALUES (?, ?, ?)',localDate,'pass',now);
  });
}

export async function grantHolidayFromDraw(localDate: string) {
  if (!validLocalDate(localDate)) throw new Error('Use date format YYYY-MM-DD.');
  const db = await getDatabase(); const now = new Date().toISOString();
  await db.runAsync('INSERT OR REPLACE INTO holiday_days (local_date, source, created_at) VALUES (?, ?, ?)',localDate,'draw',now);
}

export async function isHoliday(localDate: string) {
  if (getFixedHoliday(localDate)) return true;
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ local_date: string }>('SELECT local_date FROM holiday_days WHERE local_date = ?',localDate);
  return Boolean(row);
}

export async function listUpcomingHolidays(fromLocalDate: string) {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ local_date: string; source: Exclude<HolidayDay['source'],'fixed'>; created_at: string }>(
    'SELECT local_date, source, created_at FROM holiday_days WHERE local_date >= ? ORDER BY local_date',fromLocalDate,
  );
  const custom = rows.map(row => ({ localDate: row.local_date, source: row.source, createdAt: row.created_at } as HolidayDay));
  const fixed = listUpcomingFixedHolidays(fromLocalDate).map(item => ({localDate:item.localDate,source:'fixed' as const,createdAt:'',name:item.name}));
  const merged = [...custom, ...fixed]; const byDate = new Map<string, HolidayDay>();
  for (const item of merged) if (!byDate.has(item.localDate) || item.source !== 'fixed') byDate.set(item.localDate, item);
  return [...byDate.values()].sort((a,b)=>a.localDate.localeCompare(b.localDate));
}
