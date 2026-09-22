import { addHolidayPass } from '../data/holidayRepository';
import { grantAnnualLeaveMinutes } from '../data/leaveRepository';
import { applyReward } from '../data/economyRepository';
import { drawPrize, PrizeReward } from '../engine/prizePool';

export async function settlePrizeDraw(random = Math.random): Promise<PrizeReward> {
  const reward = drawPrize(random);
  if (reward.type === 'coin') {
    await applyReward({ source: 'prize_pool', coin: reward.amount, xp: 0 });
  } else if (reward.type === 'annual_leave_minutes') {
    await grantAnnualLeaveMinutes(reward.minutes);
  } else if (reward.type === 'holiday_pass') {
    await addHolidayPass(reward.quantity);
  }
  return reward;
}
