export type RewardPool='time'|'function';
export type TenDrawChoice={pool:RewardPool;type:'annual_leave_minutes'|'freedom_credit'|'weekly_boost';amount?:number;quantity?:number;boost?:'discount'|'limit_plus_one';label:string};

// 10-draw limited rewards are calibrated at roughly 5× a normal fixed reward in the same pool.
export const TEN_DRAW_CHOICES:Record<RewardPool,readonly TenDrawChoice[]>={
 time:[
  {pool:'time',type:'annual_leave_minutes',amount:150,label:'+150 min Annual Leave · 5×30m'},
  {pool:'time',type:'annual_leave_minutes',amount:300,label:'+300 min Annual Leave · 5×60m'},
  {pool:'time',type:'annual_leave_minutes',amount:600,label:'+600 min Annual Leave · 5×120m'},
 ],
 function:[
  {pool:'function',type:'freedom_credit',amount:5,label:'+5 Freedom Credits'},
  {pool:'function',type:'weekly_boost',boost:'discount',quantity:5,label:'5 × 25% Off Coupons · 7 days'},
  {pool:'function',type:'weekly_boost',boost:'limit_plus_one',quantity:5,label:'5 × Purchase Limit +1 Coupons · 7 days'},
 ],
};

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
