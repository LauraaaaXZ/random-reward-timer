# Random Reward Timer

An Android-first gamified productivity app with smart scheduling, randomized focus sessions, task dependencies, and adaptive rewards.

## Alpha 0.1 status

The first Android alpha is ready for device smoke testing.

Validated on every push through GitHub Actions:

- dependency installation
- TypeScript
- Expo Doctor
- Android JavaScript bundle export

The core app is local-first. Outlook Calendar is optional for Alpha 0.1; the app can run without Microsoft sign-in. Calendar integration is being treated as a separate integration track so OAuth problems do not block testing the task, timer, reward, leave, and rest systems.

## Core Alpha loop

**Task → prerequisite unlock → free window → 30/60/90 draw → focus timer → settlement → XP/Coin/Draw Credit → mandatory rest → unlock next task**

Also available in the current codebase:

- fixed task + randomized focus time
- daily/fragment tasks
- random task invitations
- XP level progress
- task dependencies
- holiday / annual leave / compensatory leave logic
- weekly leisure/outdoor credits
- prize pools and draw credit
- session-level protection against duplicate settlement rewards

## First Android test: Expo Go

This project currently uses Expo SDK modules only, so Expo Go is the fastest path for the first smoke test.

On the computer:

```bash
git clone https://github.com/LauraaaaXZ/random-reward-timer.git
cd random-reward-timer
npm install
npx expo start
```

On the Android phone:

1. Install **Expo Go**.
2. Keep the phone and computer on the same Wi-Fi network.
3. Open Expo Go and scan the QR code shown by `npx expo start`.
4. Wait for **Preparing your local workspace…** to finish.
5. The Today screen should open. If local SQLite initialization fails, the app shows **Could not prepare local data** and a **Retry startup** button rather than silently entering a broken state.

## Suggested first smoke test

1. Open **Tasks** and create one Easy task with a short estimate.
2. Create a second task with the first task as its prerequisite; confirm it is locked.
3. Return to **Today** and start a 30-minute pool.
4. Try both **Random task + time** and **Choose task + random time**.
5. Start the timer, end it early for the smoke test, and mark the primary task completed.
6. Confirm Coin / XP / Draw Credit settlement and Mandatory Rest.
7. Return to Tasks and confirm the dependent task unlocks.
8. Close and reopen the app to confirm the SQLite state persists.

For the first smoke test, do not judge reward balance or timer duration yet; the goal is to catch runtime, database, navigation, and settlement bugs.

## Outlook Calendar

The retained Outlook implementation enumerates the signed-in user's calendars and merges their events. It is intended for the user's personal Outlook account and all calendars under that account.

Outlook OAuth is not required for the first Alpha 0.1 device test. We will validate the personal-Microsoft-account sign-in flow separately before treating Outlook sync as production-ready.

## Development checks

```bash
npm run typecheck
npm run doctor
npx expo export --platform android --output-dir dist-ci
```

## Structure

```text
src/
  App.tsx
  config/gameConfig.ts
  data/
  domain/
  engine/
  integrations/outlookCalendar.ts
  screens/
  services/
```

The repository is intentionally local-first. Cloud accounts and external integrations should not prevent the core productivity loop from running.
