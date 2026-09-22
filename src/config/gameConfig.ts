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
  annualLeaveMinutesPerDay: 480,
  annualLeavePurchase: { unitMinutes: 60, baseCoinCost: 100, priceGrowth: 1.25 },
  holidayPass: { weeklyGrant: 1, extensionCoinCost: 60, maxExtensionWeeks: 1 },
  mandatoryRest: {
    optionsMinutes: [5, 10, 15, 30] as const,
    chooseCoinCost: 20,
    nextDrawDelayOptionsMinutes: [0, 15, 30, 60] as const,
  },
  weeklyRoutine: {
    leisure: {
      weeklyCredits: 3,
      weeklyMinutesCap: 360,
      purchase: { coinCost: 100, creditsAdded: 1, minutesAdded: 180, weeklyPurchaseLimit: 1 },
    },
    outdoor: { previousWeekWorkRatio: 0.5 },
  },
} as const;
