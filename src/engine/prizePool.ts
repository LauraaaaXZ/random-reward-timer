export type PrizeReward =
  | { type: 'coin'; amount: number; label: string }
  | { type: 'annual_leave_minutes'; minutes: number; label: string };

export type UltimateChoice =
  | { category: 'time'; type: 'annual_leave_minutes'; minutes: number; label: string }
  | { category: 'resource'; type: 'coin'; amount: number; label: string }
  | { category: 'freedom'; type: 'freedom_credit'; quantity: number; label: string };

type WeightedPrize = { weight: number; reward: PrizeReward };

// Holiday Pass is never purchasable or drawable. It is a weekly expiring benefit only.
export const STANDARD_PRIZE_POOL: WeightedPrize[] = [
  { weight: 32, reward: { type: 'coin', amount: 20, label: '+20 Coin' } },
  { weight: 24, reward: { type: 'coin', amount: 40, label: '+40 Coin' } },
  { weight: 16, reward: { type: 'annual_leave_minutes', minutes: 30, label: '+30 min Annual Leave' } },
  { weight: 11, reward: { type: 'annual_leave_minutes', minutes: 60, label: '+60 min Annual Leave' } },
  { weight: 6, reward: { type: 'annual_leave_minutes', minutes: 90, label: '+90 min Annual Leave' } },
  { weight: 3, reward: { type: 'annual_leave_minutes', minutes: 120, label: '+120 min Annual Leave' } },
];

export const ULTIMATE_CHOICES: readonly UltimateChoice[] = [
  { category: 'time', type: 'annual_leave_minutes', minutes: 480, label: '+1 Permanent Annual Leave Day' },
  { category: 'resource', type: 'coin', amount: 500, label: '+500 Coin' },
  { category: 'freedom', type: 'freedom_credit', quantity: 1, label: '+1 Freedom Credit' },
];

export function drawPrize(random=Math.random):PrizeReward{const total=STANDARD_PRIZE_POOL.reduce((s,i)=>s+i.weight,0);let cursor=random()*total;for(const item of STANDARD_PRIZE_POOL){cursor-=item.weight;if(cursor<0)return item.reward;}return STANDARD_PRIZE_POOL[STANDARD_PRIZE_POOL.length-1].reward;}
