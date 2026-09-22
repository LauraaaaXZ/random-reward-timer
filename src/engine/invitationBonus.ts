export type InvitationBonus=
 | {type:'coin';amount:number;label:string}
 | {type:'annual_leave_minutes';minutes:number;label:string}
 | {type:'draw_credit';amount:number;label:string};

// Invitation bonuses are intentionally modest: the invitation should feel attractive,
// but should not become more important than the user's planned workflow.
export function drawInvitationBonus(random=Math.random):InvitationBonus{
 const roll=random();
 if(roll<.50){const amount=[10,15,20,30][Math.floor(random()*4)]??10;return{type:'coin',amount,label:`Invitation Bonus · +${amount} Coin`};}
 if(roll<.82){const minutes=[15,30,45,60][Math.floor(random()*4)]??15;return{type:'annual_leave_minutes',minutes,label:`Invitation Bonus · +${minutes} min Annual Leave`};}
 const amount=[.25,.5,.75][Math.floor(random()*3)]??.25;return{type:'draw_credit',amount,label:`Invitation Bonus · +${amount} Draw Credit`};
}
