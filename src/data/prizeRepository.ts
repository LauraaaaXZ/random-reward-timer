import { getDatabase } from './database';

export type PrizeProgress = {
  lifetimeDraws: number;
  drawsSinceUltimate: number;
  ultimateClaims: number;
  drawsUntilUltimate: number;
  progress: number;
};

export const ULTIMATE_DRAW_TARGET = 100;

export async function getPrizeProgress(): Promise<PrizeProgress> {
  const db=await getDatabase();
  const row=await db.getFirstAsync<{lifetime_draws:number;draws_since_ultimate:number;ultimate_claims:number}>('SELECT lifetime_draws,draws_since_ultimate,ultimate_claims FROM prize_progress WHERE id=1');
  const draws=row?.draws_since_ultimate??0;
  return {lifetimeDraws:row?.lifetime_draws??0,drawsSinceUltimate:draws,ultimateClaims:row?.ultimate_claims??0,drawsUntilUltimate:Math.max(0,ULTIMATE_DRAW_TARGET-draws),progress:Math.min(1,draws/ULTIMATE_DRAW_TARGET)};
}

export async function recordStandardDraw(){
  const db=await getDatabase(),now=new Date().toISOString();
  await db.runAsync('UPDATE prize_progress SET lifetime_draws=lifetime_draws+1,draws_since_ultimate=draws_since_ultimate+1,updated_at=? WHERE id=1',now);
  return getPrizeProgress();
}

export async function claimUltimateProgress(){
  const db=await getDatabase();const current=await getPrizeProgress();
  if(current.drawsSinceUltimate<ULTIMATE_DRAW_TARGET)return false;
  const now=new Date().toISOString();
  await db.runAsync('UPDATE prize_progress SET draws_since_ultimate=draws_since_ultimate-?,ultimate_claims=ultimate_claims+1,updated_at=? WHERE id=1',ULTIMATE_DRAW_TARGET,now);
  return true;
}
