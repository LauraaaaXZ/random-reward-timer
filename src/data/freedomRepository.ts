import { getDatabase } from './database';

export type FreedomAction =
  | 'free_reroll'
  | 'temporary_dnd'
  | 'choose_task'
  | 'task_conversion'
  | 'rule_exception';

// Hard constraints are intentionally excluded: prerequisite dependencies and
// deadline final-work-window locks can never be bypassed by Freedom Credit.
export const FREEDOM_ACTIONS: readonly FreedomAction[] = [
  'free_reroll',
  'temporary_dnd',
  'choose_task',
  'task_conversion',
  'rule_exception',
];

export async function getFreedomCredits(){
  const db=await getDatabase();
  const row=await db.getFirstAsync<{quantity:number}>('SELECT quantity FROM inventory WHERE resource_key=?','freedom_credit');
  return row?.quantity??0;
}

export async function addFreedomCredits(quantity=1){
  if(quantity<=0)return getFreedomCredits();
  const db=await getDatabase(),now=new Date().toISOString();
  await db.runAsync(`INSERT INTO inventory (resource_key,quantity,updated_at) VALUES ('freedom_credit',?,?) ON CONFLICT(resource_key) DO UPDATE SET quantity=quantity+excluded.quantity,updated_at=excluded.updated_at`,quantity,now);
  return getFreedomCredits();
}

export async function consumeFreedomCredit(action:FreedomAction){
  if(!FREEDOM_ACTIONS.includes(action))throw new Error('This action is not eligible for Freedom Credit.');
  const db=await getDatabase(),now=new Date().toISOString();
  const current=await getFreedomCredits();
  if(current<1)throw new Error('No Freedom Credit available.');
  await db.runAsync('UPDATE inventory SET quantity=quantity-1,updated_at=? WHERE resource_key=?',now,'freedom_credit');
  return getFreedomCredits();
}
