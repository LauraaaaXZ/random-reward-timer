import { GAME_CONFIG } from '../config/gameConfig';
import { CalendarBlock, FreeWindow, SessionPool } from '../domain/types';

function toMs(value: string) { return new Date(value).getTime(); }

export function mergeBlockedTime(blocks: CalendarBlock[]): CalendarBlock[] {
  if (!blocks.length) return [];
  const sorted = [...blocks].sort((a,b)=>toMs(a.startAt)-toMs(b.startAt));
  const merged: CalendarBlock[] = [];
  for (const block of sorted) {
    const previous = merged[merged.length-1];
    if (!previous || toMs(block.startAt)>toMs(previous.endAt)) { merged.push({...block}); continue; }
    if (toMs(block.endAt)>toMs(previous.endAt)) previous.endAt=block.endAt;
    previous.title=previous.title===block.title?previous.title:'Protected time';
    previous.kind=previous.kind===block.kind?previous.kind:'calendar';
  }
  return merged;
}

export function calculateFreeWindows(dayStartAt:string,dayEndAt:string,blocks:CalendarBlock[]):FreeWindow[]{
  const start=toMs(dayStartAt),end=toMs(dayEndAt); if(end<=start)return[];
  const clipped=blocks.map(block=>({...block,startAt:new Date(Math.max(start,toMs(block.startAt))).toISOString(),endAt:new Date(Math.min(end,toMs(block.endAt))).toISOString()})).filter(block=>toMs(block.endAt)>toMs(block.startAt));
  const merged=mergeBlockedTime(clipped); const windows:FreeWindow[]=[]; let cursor=start;
  for(const block of merged){const blockStart=toMs(block.startAt);if(blockStart>cursor){const durationMinutes=Math.floor((blockStart-cursor)/60000);if(durationMinutes>=GAME_CONFIG.minimumCommitmentMinutes)windows.push({startAt:new Date(cursor).toISOString(),endAt:new Date(blockStart).toISOString(),durationMinutes});}cursor=Math.max(cursor,toMs(block.endAt));}
  if(cursor<end){const durationMinutes=Math.floor((end-cursor)/60000);if(durationMinutes>=GAME_CONFIG.minimumCommitmentMinutes)windows.push({startAt:new Date(cursor).toISOString(),endAt:new Date(end).toISOString(),durationMinutes});}
  return windows;
}

export function currentFreeWindow(windows:FreeWindow[],now=new Date()):FreeWindow|undefined{
  const t=now.getTime(); return windows.find(window=>toMs(window.startAt)<=t&&t<toMs(window.endAt));
}

export function remainingMinutesInWindow(window:FreeWindow,now=new Date()){
  return Math.max(0,Math.floor((toMs(window.endAt)-now.getTime())/60000));
}

export function nextBlock(blocks:CalendarBlock[],now=new Date()):CalendarBlock|undefined{
  const t=now.getTime(); return [...blocks].filter(block=>toMs(block.startAt)>t).sort((a,b)=>toMs(a.startAt)-toMs(b.startAt))[0];
}

export function availableSessionPools(freeMinutes:number):SessionPool[]{
  if(freeMinutes<GAME_CONFIG.minimumCommitmentMinutes)return[];
  const pools:SessionPool[]=[30]; if(freeMinutes>=60)pools.push(60); if(freeMinutes>=90)pools.push(90,'deep'); return pools;
}
export function poolCapForWindow(pool:SessionPool,freeMinutes:number){if(freeMinutes<GAME_CONFIG.minimumCommitmentMinutes)return 0;if(pool==='deep')return freeMinutes;if(freeMinutes<pool)return freeMinutes<30&&pool===30?freeMinutes:0;return pool;}
export function totalAvailableMinutes(windows:FreeWindow[]){return windows.reduce((sum,window)=>sum+window.durationMinutes,0);}
export function difficultyCapacityMinutes(windows:FreeWindow[]){return Math.floor(totalAvailableMinutes(windows)*GAME_CONFIG.difficultyCapacityRatio);}
