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

// Completing a task grants generic draw progress plus a random Coin bonus.
// The player decides later whether to spend banked draws in Time or Function Pool.
export function taskCompletionReward(difficulty:'easy'|'medium'|'hard'|'super_difficult',workedMinutes:number,random=Math.random){
 const baseRanges={easy:[.15,.35],medium:[.3,.65],hard:[.55,1],super_difficult:[.8,1.5]} as const;
 const coinRanges={easy:[2,8],medium:[5,14],hard:[9,22],super_difficult:[15,35]} as const;
 const [lo,hi]=baseRanges[difficulty];
 const timeFactor=Math.min(1.5,Math.max(.6,Math.sqrt(Math.max(5,workedMinutes)/30)));
 const drawProgress=(lo+(hi-lo)*random())*timeFactor;
 const [coinLo,coinHi]=coinRanges[difficulty];
 const coin=Math.round(coinLo+(coinHi-coinLo)*random());
 return{drawProgress:Number(drawProgress.toFixed(2)),coin};
}
