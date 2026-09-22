import { grantAnnualLeaveMinutes } from '../data/leaveRepository';
import { addFreedomCredits } from '../data/freedomRepository';
import { applyReward } from '../data/economyRepository';
import { recordStandardDraw, getPrizeProgress, claimUltimateProgress } from '../data/prizeRepository';
import { drawPrize, PrizeReward, UltimateChoice, ULTIMATE_CHOICES } from '../engine/prizePool';

export async function settlePrizeDraw(random=Math.random):Promise<{reward:PrizeReward;ultimateReady:boolean}>{
 const reward=drawPrize(random);
 if(reward.type==='coin')await applyReward({source:'prize_pool',coin:reward.amount,xp:0});
 else if(reward.type==='annual_leave_minutes')await grantAnnualLeaveMinutes(reward.minutes);
 const progress=await recordStandardDraw();
 return{reward,ultimateReady:progress.drawsSinceUltimate>=100};
}

export async function getUltimateStatus(){return getPrizeProgress();}
export function getUltimateChoices():readonly UltimateChoice[]{return ULTIMATE_CHOICES;}

export async function claimUltimateChoice(choice:UltimateChoice){
 const status=await getPrizeProgress();
 if(status.drawsSinceUltimate<100)throw new Error('Ultimate Prize is not unlocked yet.');
 if(choice.category==='time'&&choice.type==='annual_leave_minutes')await grantAnnualLeaveMinutes(choice.minutes);
 else if(choice.category==='resource'&&choice.type==='coin')await applyReward({source:'ultimate_prize',coin:choice.amount,xp:0});
 else if(choice.category==='freedom'&&choice.type==='freedom_credit')await addFreedomCredits(choice.quantity);
 else throw new Error('Invalid Ultimate Prize choice.');
 const consumed=await claimUltimateProgress();
 if(!consumed)throw new Error('Could not consume Ultimate Prize unlock.');
 return choice;
}
