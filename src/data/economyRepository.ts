import { getDatabase } from './database';
import { randomUUID } from '../utils/id';

export type Wallet = { coin: number; xp: number; level: number };

function levelFromXp(xp: number) {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
}

export async function getWallet(): Promise<Wallet> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Wallet>('SELECT coin, xp, level FROM wallet WHERE id = 1');
  return row ?? { coin: 0, xp: 0, level: 1 };
}

export async function applyReward(input: {
  sessionId?: string;
  source: string;
  coin: number;
  xp: number;
  multiplier?: number;
}) {
  const db = await getDatabase();
  const current = await getWallet();
  const nextXp = current.xp + input.xp;
  const nextLevel = levelFromXp(nextXp);
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE wallet SET coin = coin + ?, xp = ?, level = ?, updated_at = ? WHERE id = 1',
      input.coin,
      nextXp,
      nextLevel,
      now,
    );
    await db.runAsync(
      `INSERT INTO reward_events (id, session_id, source, coin_delta, xp_delta, multiplier, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      randomUUID(),
      input.sessionId ?? null,
      input.source,
      input.coin,
      input.xp,
      input.multiplier ?? 1,
      now,
    );
  });

  return { coin: current.coin + input.coin, xp: nextXp, level: nextLevel };
}
