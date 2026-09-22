import { Difficulty, DrawMode } from '../domain/types';

const difficultyMultiplier: Record<Difficulty, number> = {
  easy: 0.9,
  medium: 1,
  hard: 1.2,
  super_difficult: 1.45,
};

export function calculateSessionReward(input: {
  actualMinutes: number;
  commitmentMinutes: number;
  difficulty: Difficulty;
  drawMode: DrawMode;
  completedTaskCount: number;
  random?: () => number;
}) {
  const random = input.random ?? Math.random;
  const regularMinutes = Math.min(input.actualMinutes, input.commitmentMinutes);
  const overtimeMinutes = Math.max(0, input.actualMinutes - input.commitmentMinutes);

  // Overtime deliberately earns less per minute than the committed session.
  const rawCoin = regularMinutes * 0.8 + overtimeMinutes * 0.25;
  const rawXp = regularMinutes * 1.2 + overtimeMinutes * 0.5;
  const difficulty = difficultyMultiplier[input.difficulty];
  const blindDraw = input.drawMode === 'difficulty_random' ? 1.05 + random() * 0.1 : 1;

  // Dual task gets one 1.05–1.15 roll; triple task compounds it twice.
  const extraCompletedTasks = Math.max(0, Math.min(2, input.completedTaskCount - 1));
  let multiTask = 1;
  for (let i = 0; i < extraCompletedTasks; i += 1) {
    multiTask *= 1.05 + random() * 0.1;
  }

  const multiplier = difficulty * blindDraw * multiTask;
  return {
    coin: Math.max(1, Math.round(rawCoin * multiplier)),
    xp: Math.max(1, Math.round(rawXp * multiplier)),
    multiplier,
    overtimeMinutes,
    multiTask,
    blindDraw,
  };
}
