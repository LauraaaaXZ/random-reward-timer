# Random Reward Timer

An Android-first gamified productivity app with smart scheduling, randomized focus sessions, task dependencies, and adaptive rewards.

## V0.1 goal

Run the smallest complete loop:

**Task → prerequisite unlock → free window → 30/60/90 draw → focus timer → settlement → XP/Coin → unlock next task**

## Product rules already represented

- Difficulty: Easy / Medium / Hard / Super Difficult
- Ordered task dependencies; incomplete prerequisites lock dependent tasks
- Circular dependencies are rejected by the domain engine
- Session pools: 30 / 60 / 90 / Deep Work
- Minimum randomized commitment: 5 minutes
- Commitment is capped by the selected pool, free window, and 110% of remaining task estimate
- Difficulty capacity target: 50% of available work time
- Game/economy parameters live in one configuration module so they can be calibrated later

## Structure

```text
src/
  App.tsx                 Android-first Today Timeline shell
  config/gameConfig.ts    Tunable product/economy parameters
  domain/types.ts         Task, dependency, session types
  domain/dependencies.ts  Prerequisite lock and cycle detection
  engine/random.ts        Weighted task + commitment-time draw
```

## Run locally

Install Node.js LTS and Android Studio or Expo Go, then:

```bash
npm install
npx expo start
```

For an Android emulator/device:

```bash
npm run android
```

## Next implementation slice

1. Add local SQLite persistence and migrations.
2. Build Task CRUD + prerequisite selector.
3. Replace mock timeline blocks with calculated free windows.
4. Connect Draw → Timer → Settlement.
5. Add XP/Coin ledger and dependency auto-unlock.

The repository is intentionally local-first. Accounts, cloud sync, social features, and leaderboards are outside V0.1.
