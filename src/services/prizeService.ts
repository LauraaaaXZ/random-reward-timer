import { getDatabase } from '../data/database';
import { grantAnnualLeaveMinutes } from '../data/leaveRepository';
import { addFreedomCredits } from '../data/freedomRepository';
import { grantWeeklyBoost } from '../data/weeklyBoostRepository';
import { applyReward } from '../data/economyRepository';
import { spendDraws } from '../data/drawBankRepository';
import { recordStandardDraw, getPrizeProgress, claimUltimateProgress } from '../data/prizeRepository';
import { RewardPool, TEN_DRAW_CHOICES, TenDrawChoice } from '../engine/rewardPools';
import { drawPrize, PrizeReward, UltimateChoice, ULTIMATE_CHOICES } from '../engine/prizePool';

async function currentWeekWorkMinutes(now=new Date()){
 const db=await getDatabase();const d=new Date(now);const day=d.getDay()||7;const start=new Date(d);start.setHours(0,0,0,0);start.setDate(d.getDate()-(day-1));
 const row=await db.getFirstAsync<{minutes:number}>(`SELECT COALESCE(SUM(actual_minutes),0) AS minutes FROM focus_sessions WHERE ended_at>=? AND ended_at<=?`,start.toISOString(),now.toISOString());
 return row?.minutes??0;
}
async function settleReward(reward:PrizeReward|TenDrawChoice,source='prize_pool'){
 if(reward.type==='coin')await applyReward({source,coin:reward.amount,xp:0});
 else if(reward.type==='annual_leave_minutes')await grantAnnualLeaveMinutes('minutes' in reward?reward.minutes:(reward.amount??0));
 else if(reward.type==='freedom_credit')await addFreedomCredits('quantity' in reward?reward.quantity:(reward.amount??1));
 else if(reward.type==='weekly_boost'){const quantity='quantity' in reward?(reward.quantity??1):1;for(let i=0;i<quantity;i+=1)await grantWeeklyBoost(reward.boost,reward.discountRate??.25);}
}
export async function settlePrizeDraw(pool:RewardPool,random=Math.random):Promise<{reward:PrizeReward;ultimateReady:boolean}>{
 await spendDraws(pool,1);
 const weeklyWork=await currentWeekWorkMinutes();const reward=drawPrize(pool,random,weeklyWork);await settleReward(reward);
 const progress=await recordStandardDraw();return{reward,ultimateReady:progress.drawsSinceUltimate>=100};
}
export function getTenDrawChoices(pool:RewardPool){return TEN_DRAW_CHOICES[pool];}
export async function claimTenDrawChoice(pool:RewardPool,choice:TenDrawChoice){
 if(choice.pool!==pool)throw new Error('Choice does not belong to this pool.');
 await spendDraws(pool,10);await settleReward(choice,'ten_draw_reward');return choice;
}
export async function getUltimateStatus(){return getPrizeProgress();}
export function getUltimateChoices():readonly UltimateChoice[]{return ULTIMATE_CHOICES;}
export async function claimUltimateChoice(choice:UltimateChoice){
 const status=await getPrizeProgress();if(status.drawsSinceUltimate<100)throw new Error('Ultimate Prize is not unlocked yet.');
 if(choice.category==='time'&&choice.type==='annual_leave_minutes')await grantAnnualLeaveMinutes(choice.minutes);
 else if(choice.category==='resource'&&choice.type==='coin')await applyReward({source:'ultimate_prize',coin:choice.amount,xp:0});
 else if(choice.category==='freedom'&&choice.type==='freedom_credit')await addFreedomCredits(choice.quantity);
 else throw new Error('Invalid Ultimate Prize choice.');
 const consumed=await claimUltimateProgress();if(!consumed)throw new Error('Could not consume Ultimate Prize unlock.');return choice;
}
