import { addHolidayPass } from '../data/holidayRepository';
import { grantAnnualLeaveMinutes } from '../data/leaveRepository';
import { applyReward } from '../data/economyRepository';
import { recordStandardDraw, getPrizeProgress, claimUltimateProgress } from '../data/prizeRepository';
import { drawPrize, PrizeReward } from '../engine/prizePool';

export async function settlePrizeDraw(random = Math.random): Promise<{reward:PrizeReward;ultimateReady:boolean}> {
  const reward = drawPrize(random);
  if (reward.type === 'coin') await applyReward({ source: 'prize_pool', coin: reward.amount, xp: 0 });
  else if (reward.type === 'annual_leave_minutes') await grantAnnualLeaveMinutes(reward.minutes);
  else if (reward.type === 'holiday_pass') await addHolidayPass(reward.quantity);
  const progress=await recordStandardDraw();
  return {reward,ultimateReady:progress.drawsSinceUltimate>=100};
}

export async function getUltimateStatus(){return getPrizeProgress();}

// Claim consumes 100 accumulated draws. The actual ultimate reward choice is kept separate
// so the UI can later offer the agreed user-selectable milestone reward instead of auto-awarding one.
export async function consumeUltimateUnlock(){return claimUltimateProgress();}
