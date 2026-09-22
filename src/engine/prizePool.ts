export type PrizeReward =
  | { type: 'coin'; amount: number; label: string }
  | { type: 'annual_leave_minutes'; minutes: number; label: string }
  | { type: 'holiday_pass'; quantity: number; label: string };

type WeightedPrize = { weight: number; reward: PrizeReward };

// Time-based exemptions are represented only as Annual Leave minutes.
// 480 minutes = 1 annual-leave day.
export const STANDARD_PRIZE_POOL: WeightedPrize[] = [
  { weight: 30, reward: { type: 'coin', amount: 20, label: '+20 Coin' } },
  { weight: 22, reward: { type: 'coin', amount: 40, label: '+40 Coin' } },
  { weight: 14, reward: { type: 'annual_leave_minutes', minutes: 30, label: '+30 min Annual Leave' } },
  { weight: 10, reward: { type: 'annual_leave_minutes', minutes: 60, label: '+60 min Annual Leave' } },
  { weight: 5, reward: { type: 'annual_leave_minutes', minutes: 90, label: '+90 min Annual Leave' } },
  { weight: 3, reward: { type: 'annual_leave_minutes', minutes: 120, label: '+120 min Annual Leave' } },
  { weight: 1, reward: { type: 'holiday_pass', quantity: 1, label: '+1 Holiday Pass' } },
];

export function drawPrize(random = Math.random): PrizeReward {
  const total = STANDARD_PRIZE_POOL.reduce((sum,item)=>sum+item.weight,0);
  let cursor = random()*total;
  for (const item of STANDARD_PRIZE_POOL) {
    cursor -= item.weight;
    if (cursor < 0) return item.reward;
  }
  return STANDARD_PRIZE_POOL[STANDARD_PRIZE_POOL.length-1].reward;
}
