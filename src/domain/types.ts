export type Difficulty = 'easy' | 'medium' | 'hard' | 'super_difficult';
export type TaskStatus = 'active' | 'locked' | 'completed' | 'archived';

export interface Task {
  id: string;
  name: string;
  estimatedMinutes: number;
  remainingMinutes: number;
  difficulty: Difficulty;
  status: TaskStatus;
  deadlineAt?: string;
  finalWorkWindowAt?: string;
  preferredToday: boolean;
  avoidanceCount: number;
  recoveryStack: number;
  createdAt: string;
  completedAt?: string;
}

export interface TaskDependency {
  prerequisiteTaskId: string;
  dependentTaskId: string;
}

export type SessionPool = 30 | 60 | 90 | 'deep';
export type DrawMode = 'normal' | 'difficulty_pick' | 'difficulty_random';

export interface FocusSession {
  id: string;
  taskId: string;
  pool: SessionPool;
  drawMode: DrawMode;
  commitmentMinutes: number;
  actualMinutes?: number;
  startedAt?: string;
  endedAt?: string;
}
