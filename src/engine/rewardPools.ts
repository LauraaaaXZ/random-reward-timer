export type RewardPool='time'|'function';
export type TenDrawChoice={pool:RewardPool;type:'annual_leave_minutes'|'freedom_credit'|'weekly_boost';amount?:number;boost?:'discount'|'limit_plus_one';label:string};

export const TEN_DRAW_CHOICES:Record<RewardPool,readonly TenDrawChoice[]>={
 time:[
  {pool:'time',type:'annual_leave_minutes',amount:120,label:'+120 min Annual Leave'},
  {pool:'time',type:'annual_leave_minutes',amount:180,label:'+180 min Annual Leave'},
  {pool:'time',type:'annual_leave_minutes',amount:240,label:'+240 min Annual Leave'},
 ],
 function:[
  {pool:'function',type:'freedom_credit',amount:1,label:'+1 Freedom Credit'},
  {pool:'function',type:'weekly_boost',boost:'discount',label:'25% Off Coupon · 7 days'},
  {pool:'function',type:'weekly_boost',boost:'limit_plus_one',label:'Purchase Limit +1 · 7 days'},
 ],
};

export function taskDrawReward(difficulty:'easy'|'medium'|'hard'|'super_difficult',random=Math.random){
 const ranges={easy:[.15,.35],medium:[.3,.65],hard:[.55,1],super_difficult:[.8,1.5]} as const;
 const [lo,hi]=ranges[difficulty];const raw=lo+(hi-lo)*random();
 // Each completed task earns a random split between Time and Function draw progress.
 const timeShare=.3+.4*random();
 return{total:Number(raw.toFixed(2)),time:Number((raw*timeShare).toFixed(2)),function:Number((raw*(1-timeShare)).toFixed(2))};
}
