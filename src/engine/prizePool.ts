export type PrizeReward =
  | { type: 'coin'; amount: number; label: string }
  | { type: 'annual_leave_minutes'; minutes: number; label: string }
  | { type: 'weekly_boost'; boost: 'discount'|'limit_plus_one'; discountRate?: number; label: string };

export type UltimateChoice =
  | { category: 'time'; type: 'annual_leave_minutes'; minutes: number; label: string }
  | { category: 'resource'; type: 'coin'; amount: number; label: string }
  | { category: 'freedom'; type: 'freedom_credit'; quantity: number; label: string };

type WeightedPrize = { weight: number; reward: PrizeReward; workBoost?: boolean };

// Holiday Pass is never purchasable or drawable. Weekly boost coupons exist only in this draw pool.
export const STANDARD_PRIZE_POOL: WeightedPrize[] = [
  { weight: 32, reward: { type: 'coin', amount: 20, label: '+20 Coin' } },
  { weight: 24, reward: { type: 'coin', amount: 40, label: '+40 Coin' } },
  { weight: 16, reward: { type: 'annual_leave_minutes', minutes: 30, label: '+30 min Annual Leave' } },
  { weight: 11, reward: { type: 'annual_leave_minutes', minutes: 60, label: '+60 min Annual Leave' } },
  { weight: 6, reward: { type: 'annual_leave_minutes', minutes: 90, label: '+90 min Annual Leave' } },
  { weight: 3, reward: { type: 'annual_leave_minutes', minutes: 120, label: '+120 min Annual Leave' } },
  { weight: 2, workBoost: true, reward: { type: 'weekly_boost', boost: 'discount', discountRate: .25, label: '25% Off Coupon · 7 days' } },
  { weight: 1, workBoost: true, reward: { type: 'weekly_boost', boost: 'limit_plus_one', label: 'Purchase Limit +1 Coupon · 7 days' } },
];

export const ULTIMATE_CHOICES: readonly UltimateChoice[] = [
  { category: 'time', type: 'annual_leave_minutes', minutes: 480, label: '+1 Permanent Annual Leave Day' },
  { category: 'resource', type: 'coin', amount: 500, label: '+500 Coin' },
  { category: 'freedom', type: 'freedom_credit', quantity: 1, label: '+1 Freedom Credit' },
];

// More recorded work raises only the relative weight of boost coupons, not the number of draws.
// 0h => 1.0x; each 5h adds 0.25x; capped at 3.0x to prevent runaway incentives.
export function drawPrize(random=Math.random,weeklyWorkMinutes=0):PrizeReward{
 const workMultiplier=Math.min(3,1+Math.max(0,weeklyWorkMinutes)/300*.25);
 const weighted=STANDARD_PRIZE_POOL.map(i=>({item:i,w:i.weight*(i.workBoost?workMultiplier:1)}));
 const total=weighted.reduce((s,i)=>s+i.w,0);let cursor=random()*total;
 for(const entry of weighted){cursor-=entry.w;if(cursor<0)return entry.item.reward;}
 return weighted[weighted.length-1].item.reward;
}
