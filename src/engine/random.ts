import { GAME_CONFIG } from '../config/gameConfig';
import { Difficulty, SessionPool, Task } from '../domain/types';

const difficultyWeight: Record<Difficulty, number> = {
  easy: 1,
  medium: 1.2,
  hard: 1.5,
  super_difficult: 1.9,
};

export function weightedTaskDraw(tasks: Task[], random = Math.random): Task | undefined {
  if (!tasks.length) return undefined;
  const weights = tasks.map((task) => difficultyWeight[task.difficulty]);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = random() * total;
  for (let i = 0; i < tasks.length; i += 1) {
    roll -= weights[i] ?? 0;
    if (roll <= 0) return tasks[i];
  }
  return tasks[tasks.length - 1];
}

export function commitmentMinutes(
  task: Task,
  pool: SessionPool,
  freeWindowMinutes: number,
  random = Math.random,
): number {
  const poolCap = pool === 'deep' ? freeWindowMinutes : pool;
  const estimateCap = Math.ceil(task.remainingMinutes * GAME_CONFIG.estimateCapMultiplier);
  const cap = Math.max(
    GAME_CONFIG.minimumCommitmentMinutes,
    Math.min(poolCap, freeWindowMinutes, estimateCap),
  );
  const span = cap - GAME_CONFIG.minimumCommitmentMinutes + 1;
  return GAME_CONFIG.minimumCommitmentMinutes + Math.floor(random() * span);
}
