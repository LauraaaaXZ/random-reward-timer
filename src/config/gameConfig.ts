export const GAME_CONFIG = {
  sessionPools: [30, 60, 90] as const,
  minimumCommitmentMinutes: 5,
  estimateCapMultiplier: 1.1,
  difficultyCapacityRatio: 0.5,
  avoidanceEscalationAfterSkips: 2,
  earlyTerminationRecoveryRaise: 0.05,
  difficultyBlindDrawBonus: { min: 0.05, max: 0.15 },
  multiTaskBonus: { min: 1.05, max: 1.15 },
  emergencyCreditRepayment: { min: 1.25, max: 1.5 },
  preferred: { maxTasks: 3, maxMinutes: 300 },
  levelLockAfterInactiveDays: 7,
  exemptionExpiryDays: 14,
  exemptionWarningDays: 3,
  holidayPass: {
    coinCost: 120,
  },
} as const;
