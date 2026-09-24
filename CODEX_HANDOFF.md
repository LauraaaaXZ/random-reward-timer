# Codex Handoff — Random Reward Timer

> Last handoff refresh: 2026-09-24
> Repository: `LauraaaaXZ/random-reward-timer`
> Current main HEAD at handoff creation: `d67d7dc0bdbbd645c54ae553fab7aa9b9503d726`

## 0. How to use this document

This file exists so a new Codex session can continue the project without rereading the entire ChatGPT conversation.

Treat the sources of truth in this order:

1. **The user's latest explicit instruction**
2. **Frozen product decisions in this document**
3. **Current repository implementation**
4. Older implementation details or abandoned ideas

If the repository and this document differ on an implementation detail, inspect the code and preserve data compatibility. If the repository differs from a frozen product rule, prefer the product rule and migrate carefully.

Do not ask for confirmation after every small change. Work autonomously until the requested iteration is complete, unless:
- a change may destroy user data;
- a product decision is genuinely ambiguous and materially changes behavior;
- authentication/credentials are required;
- an external dependency blocks progress.

Do not claim that a feature works merely because TypeScript compiles or an Android bundle exports. Behavioral verification is required for important user flows.

---

# 1. Product intent

Random Reward Timer is an **Android-first gamified productivity application**.

The core idea is not “a game with tasks attached.” It is a productivity system where uncertainty and rewards make work easier to start while the schedule remains practical.

The app should help the user:
- see today's real schedule;
- understand available free windows;
- choose or draw work;
- accept a randomized focus commitment;
- finish work without being interrupted by excessive game UI;
- settle work into Coin / XP / Draw progress / other rewards;
- maintain deadlines, dependencies, daily tasks, routines, meals, sleep, leave, and holidays;
- occasionally receive random task invitations;
- use themes and rewards as lightweight motivation.

**Home / Today remains timeline-first, not game-first.**

---

# 2. Core task + focus flow

The intended normal flow is:

`Calendar / Today timeline → free window → choose session → task + focus time → timer → settlement → rewards → task/dependency state updates`

Supported entry modes conceptually include:

1. **Random task + random focus time**
2. **Choose task + random focus time**
3. **Choose time + random task**

However, ordinary task creation itself must **not** be described as “random task creation.” A task is just a task. Randomization happens when selecting work for a focus session.

## Free-window / pool rules

- Minimum random work window: **5 minutes**.
- Main pools: **30 / 60 / 90 minutes**.
- Deep Work is user initiated.
- If a free window is 70 min, the maximum normal pool is 60.
- If free window is >=90 min, 90 becomes available.
- User may intentionally choose a smaller pool.

Commitment time should respect:

`commitment <= min(free window, selected pool, remaining task estimate × 110%)`

Random duration should be biased shorter rather than uniformly long.

Harder tasks may skew toward shorter commitments to reduce activation friction.

## Focus timing

- When target commitment expires, session enters **overtime automatically**.
- User can finish early.
- Overtime is allowed and earns a lower fixed reward/minute.
- Settlement distinguishes early / on-time / overtime.
- If the actual task truly finishes before the commitment, do not punish the user for being efficient.

A “Gift Time” idea exists conceptually for time saved by true early completion.

---

# 3. Task model

A Task includes:
- name;
- estimated minutes;
- remaining minutes;
- difficulty;
- status;
- optional deadline;
- optional prerequisites/dependencies;
- daily behavior if applicable;
- completion state.

## Difficulty

Internal persisted enum currently includes:

- `easy`
- `medium`
- `hard`
- `super_difficult`

**UI rule:** display `super_difficult` as **Xhard**.

Do not casually rename the persisted enum because existing SQLite data and reward logic may depend on it.

Difficulty should primarily affect reward economics, not make high-difficulty tasks dramatically more likely to be drawn.

## Deadline / DDL

The model already supports `deadlineAt`.

Task creation UI must expose:
- default: **No deadline**
- optional: **Set deadline**
- date/time picker, not manual text if practical.

Deadline tasks should continue to feed Calendar / scheduling logic and be visually recognized as deadlines.

DDL logic conceptually includes:
- urgency increasing near final work window;
- no ordinary reroll once inside a final work window;
- reward may decrease for last-minute completion;
- dependency urgency can propagate backward.

Not all of this is implemented yet; preserve the architecture for later expansion.

## Dependencies

Support:
- A → B → C
- multiple prerequisites

Rules:
- cycles are forbidden;
- if prerequisites are incomplete, dependent task is locked;
- locked tasks are not drawable/preferred;
- completing a prerequisite should refresh locks.

---

# 4. Daily tasks

Daily task behavior is important.

A daily task:
- can be done once per day;
- after completion today it should not proactively appear again today;
- becomes available again on a later date;
- may be available as a fragment task, main/easy-pool task, or both depending on mode.

Example: daily news reading.

The user previously had difficulty cancelling/removing daily tasks. Preserve clear management behavior.

---

# 5. Task interaction UX

The user explicitly rejected invisible swipe gestures.

Do **not** rely on left-swipe/right-swipe as the main task management model.

Preferred interaction:
- normal tap controls remain clearly tappable;
- long-press a task enters **management mode** with visible animation/feedback;
- management mode allows selection / batch removal;
- Cancel exits management mode;
- internal buttons such as Schedule and Done must remain tappable.

Avoid nested `Pressable` layers that swallow touches.

This is a current regression area and must be behaviorally tested.

---

# 6. Scheduled tasks and routines

## App-only task schedule

A task may be scheduled inside Random Reward Timer.

Important:
- this app-only schedule must not write back into Outlook / Android calendar;
- user must be able to remove it;
- conflicts should be checked where implemented.

## Scheduled routines

Scheduled routines are recurring daily app routines with:
- name;
- target time;
- window start;
- window end.

They must be removable / archived.

The repository already has `archiveScheduledRoutine()`; UI must expose a clear remove action.

---

# 7. Meal and sleep

Meal and sleep are **app-local planning constraints**, not calendar events to be written into the external calendar.

## Meal

Meal settings should support selectable meal types such as:
- Breakfast
- Brunch
- Lunch
- Afternoon Tea
- Dinner
- similar reasonable categories

The user does not always know an exact meal time in advance, so avoid forcing awkward manual HH:MM typing where better pickers/options can be used.

## Sleep

Sleep should:
- not be written into external Calendar;
- appear on Today;
- protect work scheduling appropriately;
- warn on conflicting duplicate/overlapping sleep setup where relevant;
- give visible confirmation when saved.

Meal and sleep should **not pollute the two-week Calendar view**.

---

# 8. Today / timeline

Today is the primary screen.

It should show:
- current/free window;
- next calendar block;
- available session pools;
- routines;
- daily/fragment tasks when appropriate;
- sleep information;
- capacity guardrail;
- random invitation if active;
- timeline;
- theme avatar/decor.

The UI must remain phone-friendly and information dense enough to be useful.

Do not turn Today into a full-page game dashboard.

---

# 9. Calendar

The current desired Calendar UX is a compact **two-week mobile view**, inspired by Outlook-style compressed agenda/calendar design.

Requirements:
- show 14 days;
- show short titles for major events/tasks;
- click a day to change the agenda shown below;
- default agenda below should be Today;
- do not auto-popup a modal just from tapping a day;
- preserve mobile readability.

Automatic classification:
- titles containing **MAIB** course identifiers → `Course`
- titles containing **DUE / DDL / Deadline` → `Deadline`

Calendar should:
- sync device/Outlook-derived calendar data;
- merge all relevant user calendars when integration allows;
- not include Meal/Sleep app-local items;
- include task deadlines appropriately.

The user uses a private Outlook account, not a school Outlook tenant account. Earlier Microsoft auth attempts produced tenant/account mismatch issues, so do not claim consumer Outlook OAuth is verified unless actually tested.

---

# 10. Holiday rules

The app may visually mark holidays in Calendar, but **real time-off logic should follow Hong Kong holidays and school/university holidays**, not arbitrary calendar labels.

Fixed/public holiday support exists.

Holiday work can earn compensatory leave.

---

# 11. Work capacity / guardrails

Difficulty / work capacity is designed to prevent endless gamified overwork.

Conceptually:
- difficulty-premium capacity <= 50% of Available Work Time;
- calendar / DND overlaps are merged;
- recovery behavior may apply after over-cap days;
- user may accept / reduce / skip recovery.

Low-intensity work:
- same task pool as normal work;
- credited at **50%** toward work capacity.

---

# 12. Avoidance and urgency concepts

These are product rules to preserve even if only partially implemented.

- After >2 skips, a non-routine task can enter a **Difficulty Pool**.
- This must not mutate the task's intrinsic difficulty.
- Blind Difficulty Random can receive approximately +5–15% reward premium.
- Preferred + DDL are scheduling priority signals.
- Final deadline window reduces reroll freedom.

---

# 13. Settlement and reward safety

This area has had real bugs.

## Task completion settlement

The safe order is:

1. calculate reward;
2. write idempotent reward/draw events;
3. only then mark task/day complete;
4. refresh dependencies.

If reward writing fails, the task must remain retryable.

Duplicate tapping / retry must not grant duplicate rewards.

The repository contains idempotency mechanisms:
- Draw credit uses unique source keys;
- Coin/XP reward events can use session/source identifiers;
- Focus session settlement has duplicate protection.

Preserve these protections.

## Settlement page

The user explicitly wants a visible completion/settlement screen after focus work.

The page should show:
- Coin earned;
- XP earned;
- Draw progress;
- task completion/progress;
- other one-time bonuses where relevant.

Ordinary task completion may use a lightweight animation.

A **real Draw** should have the richer gift-box / blue crystal-ball reward animation.

Do not play a full-screen heavy animation after every trivial action.

---

# 14. Settlement Ledger

Rewards screen should have a normally-collapsed Settlement Ledger.

It should show:
- earnings;
- spending;
- task reward events;
- focus reward events;
- draw progress;
- draw spending;
- theme rental spending;
- other Coin-cost actions where possible.

Spending must appear as a negative number.

Current required explicit display:
- **Theme rental · -10 Coin**

Theme rental writes should be recorded in `reward_events` (or equivalent unified ledger) so they are visible after reload.

---

# 15. Coin / XP

- XP is permanent progression.
- Coin is spendable.
- XP level is shown as a progress bar.

Do not predict arbitrary score gains or inflate reward output.

---

# 16. Draw bank and prize pools

Draw opportunities accumulate as progress.

Users can bank unclaimed draw opportunities.

Two principal pools:
- **Time Pool**
- **Function Pool**

Ten draws unlock a limited reward selection:
- 3 choices;
- user chooses 1.

Limited 10-draw reward magnitude should feel roughly ~5× a normal internal reward, not merely cosmetic.

Work achievements may improve rare Function Pool odds.

Coupons should generally be outcomes from the Function Pool, not directly purchasable coupons.

Potential function rewards include:
- Freedom;
- weekly boost;
- discount coupon;
- purchase-limit +1 coupon.

---

# 17. Multi-task settlement

Primary draw should not preselect multiple tasks.

If additional tasks were genuinely completed during the session, they may be added retroactively at settlement.

Reward multiplier concept:
- dual: random around ×1.05–1.15
- triple: stacked roughly square of dual effect
- cap at triple

Do not expand beyond triple without a new decision.

---

# 18. Rest after work

After a completed task/session:
- mandatory rest is randomly selected from **5 / 10 / 15 / 30 min**.
- If the user wants to choose exact rest length, cost is **20 Coin**.
- User may schedule the next draw after rest.

Rest creation should be idempotent per session so double taps cannot generate conflicting new rests.

The exact-rest Coin charge should also avoid accidental double-charge from rapid tapping.

---

# 19. Random task invitations

The app may issue random task invitations during the day.

Rules:
- prefer free windows;
- do not interrupt deep focus;
- accepted task may reveal a mystery one-time bonus after completion.

Current modest bonus categories include:
- Coin;
- annual leave minutes;
- Draw credit.

Keep invitation rewards small enough that they do not dominate normal productivity behavior.

---

# 20. Leave / holiday economy

## Annual leave

- fixed annual allocation: **20 days/year**
- level-up bonus: **+0.1 annual leave day per level**
- standard leave day: **480 minutes**
- partial leave is allowed

Earlier exemption-time ideas were unified into annual leave minutes.

## Weekly Holiday Pass

- granted weekly;
- expires;
- may be extended by spending Coin;
- cannot simply be purchased as a new Holiday Pass.

## Holiday work

Working on a recognized holiday may grant compensatory leave.

---

# 21. Weekly leisure / routine credit concepts

Preserve these product rules for later expansion:

- supermarket/shopping/leisure credit: 3 uses/week, total <=6h
- purchase extra leisure credit: +1 use / +3h
- price: **100 Coin**
- outdoor activity credit total <= half of previous week's work time

These may not be fully implemented yet.

---

# 22. Theme system

Theme system is meant to feel like a full “skin,” not just a color toggle.

Themes discussed/implemented:

- **Blue Rabbit** — default/free; blue, moon/star/snow motif
- **Black Cat** — black/dark, patrol/lightning/badge motif
- **GG Bond** — red/fire/star motif
- **Lazy Sheep** — green/cloud/flower/sleepy motif
- **Hello Kitty** — pink/heart/bow motif

Character inspirations are stylistic product directions. Avoid relying on copyrighted external assets unless the user provides/authorizes them; current implementation can use original motif/iconography/emoji-like placeholders.

## Latest theme UX decision

**Do not keep Themes as a standalone bottom tab.**

Instead:
- Today shows the current theme avatar/decor;
- tapping the avatar opens a compact theme picker;
- Blue Rabbit stays free/default;
- other themes cost **10 Coin / 7 days**;
- active/rented state should be visible;
- rental expiry persists;
- theme rental spending appears in Settlement Ledger.

The theme UI should not dominate Today.

---

# 23. App branding

Desired brand visual:
- dark/deep blue night-sky background;
- gift box;
- glowing blue crystal ball / blue orb;
- no unnecessary text inside the small app icon.

Splash can be more atmospheric than the icon.

Native icon/splash assets may require actual image assets; do not pretend JSON alone creates the graphic.

Current app display name is **Random Reward**.

---

# 24. Navigation

Current functional areas:
- Today
- Tasks
- Calendar
- Rewards
- Time Off

Latest decision:
- **Themes should be removed from bottom navigation**
- Theme picker belongs in Today.

Keep bottom navigation mobile-friendly.

---

# 25. Known UI regression / current backlog

These are the immediate priorities at handoff time.

## P0 — Fix before next APK

### A. Task taps are unreliable after recent UI changes

Symptoms:
- task controls became difficult/impossible to tap after UI/theme work;
- likely interaction layering / nested Pressable regression.

Required:
- inspect TaskManager touch hierarchy;
- Schedule / Done / normal tapping must work;
- long press must still enter management mode;
- management mode must remain visible/animated;
- scrolling must not be blocked.

Behaviorally test this on Android, not only via TypeScript.

### B. Theme entry point

- remove standalone Themes tab;
- tap theme avatar on Today to open picker;
- paid theme rental requires 10 Coin / 7 days;
- no duplicated theme screen in nav.

### C. Ledger spending

- theme rental deduction must appear in Settlement Ledger;
- label it clearly as `Theme rental`;
- show `-10 Coin`.

### D. Deadline input

Task creation needs optional DDL/date-time picker using existing `deadlineAt`.

### E. Difficulty label

Display `super_difficult` as **Xhard** throughout user-facing UI.

### F. Task creation wording

Change `NEW RANDOM TASK` → `NEW TASK`.

Use `Estimated time` rather than making the task itself sound random.

## P1

- ensure Scheduled Routine removal UI works;
- verify Daily task removal;
- verify Meal/Sleep save + Today display + Calendar exclusion;
- verify Draw settlement and animation;
- verify Calendar date taps;
- verify theme persistence after restart.

---

# 26. Historical bugs that should be regression-tested

The following have broken before:

1. SQLite native statement argument mismatch after installing an APK.
2. Calendar looked unsynchronized / old APK was still installed.
3. All calendars were not always merged.
4. Calendar lacked tappable per-day agenda.
5. Upcoming Holidays layout visually overlapped/“穿模”.
6. Scheduled tasks could not be deleted.
7. Sleep duplicate/conflict behavior was unclear.
8. Meal/Sleep appeared in Calendar when they should be app-local.
9. Daily tasks could not be cancelled/managed.
10. Invisible swipe gestures were confusing.
11. Draw appeared to do nothing after task completion.
12. There was no clear settlement history.
13. UI/theme changes later interfered with Task taps.
14. Spending Coin for theme unlock did not visibly show in the user's installed Settlement Ledger.
15. Build/version confusion caused old APKs to be mistaken for current code.

Treat these as regression cases, not closed forever.

---

# 27. Calendar integration detail

There has historically been more than one Outlook/calendar integration path.

One newer implementation enumerated all calendars, while an older implementation only used the default calendar.

Do not reintroduce default-calendar-only behavior.

Today currently consumes local calendar blocks. External sync should populate those blocks.

Consumer/private Microsoft account OAuth must be tested separately from compilation.

---

# 28. Build/version discipline

A recurring user problem has been “Did I actually install the newest APK?”

For each APK iteration:
- bump version when appropriate;
- ensure package/app config is consistent;
- report commit SHA used for build;
- report EAS build ID;
- report app version / versionCode;
- make it easy for user to distinguish old/new installs.

Do not say “latest APK” without a commit/build identifier.

---

# 29. CI and testing philosophy

Existing Alpha Check is valuable but insufficient.

It currently covers build/static checks such as:
- TypeScript;
- Expo Doctor;
- Android JS bundle smoke.

A green Alpha Check **does not prove mobile behavior**.

## Required testing layers

### Level 1 — static/build
- TypeScript
- Expo Doctor
- Android bundle/build

### Level 2 — logic/integration
Add tests where practical for:
- task create/complete;
- retry-safe reward settlement;
- draw idempotency;
- theme rental Coin deduction + ledger event;
- deadline persistence;
- routine archive;
- daily-task per-day completion;
- rest idempotency.

### Level 3 — Android behavioral testing

Use an Android Emulator / virtual device / UI automation where available.

Test the app like a user:
- tap;
- type;
- long press;
- scroll;
- navigate;
- reload/restart;
- inspect persisted state.

If possible, use screenshots, logs, and DB inspection as evidence.

Always classify verification as one of:
- **VERIFIED — Android UI**
- **VERIFIED — automated integration test**
- **CODE-INSPECTED ONLY**
- **NOT VERIFIED**

Never silently upgrade CODE-INSPECTED to VERIFIED.

---

# 30. Minimum Android behavioral regression matrix

Before declaring the next APK ready, test at least:

## Startup/navigation
- launch from clean install / clean app state;
- Today loads;
- navigate Today → Tasks → Calendar → Rewards → Time Off;
- no standalone Themes bottom tab.

## Theme
- tap Today theme avatar;
- open compact theme picker;
- activate Blue Rabbit;
- rent one paid theme;
- exactly 10 Coin deducted;
- Settlement Ledger shows `Theme rental · -10 Coin`;
- restart/reload;
- rented theme remains active;
- expiry state persists.

## Tasks
- open Add Task;
- normal controls respond to taps;
- create ordinary Task;
- create Task with deadline;
- create Xhard Task;
- verify Xhard label;
- verify deadline persists;
- Schedule button works;
- Done button works;
- long press enters management mode;
- cancel management mode;
- batch select/remove works;
- scrolling still works.

## Scheduled items
- schedule Task;
- remove scheduled Task;
- create Scheduled Routine;
- remove Scheduled Routine.

## Daily
- create Daily Task;
- complete it;
- it does not proactively appear again today;
- verify removal/management works.

## Completion/economy
- complete Task;
- Coin increases once;
- Draw progress increases once;
- task state completes;
- refresh/retry does not duplicate rewards;
- Settlement page appears;
- Ledger records result.

## Draw
- where practical, accumulate enough Draw;
- trigger actual Draw;
- reward reveal animation appears;
- prize persists.

## Meal/Sleep
- configure Meal;
- configure Sleep;
- visible on Today where expected;
- not visible as normal external Calendar blocks.

## Calendar
- two-week view fits phone width;
- select another date;
- bottom agenda changes;
- Today returns correctly;
- MAIB → Course;
- DUE/DDL → Deadline;
- sync refresh does not duplicate events.

## Time Off
- balances load;
- leave scheduling controls work;
- upcoming holidays render without overlap.

---

# 31. Build handoff procedure for Codex

When this iteration is complete:

1. Ensure repository is clean.
2. Run static checks.
3. Run integration tests if added.
4. Run Android emulator behavioral suite.
5. Fix discovered defects.
6. Rerun affected scenarios.
7. Commit with meaningful messages.
8. Build Android APK.
9. Report:
   - commit SHA;
   - app version;
   - versionCode;
   - EAS build ID;
   - APK/install link if available;
   - behavioral test matrix;
   - known remaining issues.

Do not stop at “CI passed.”

---

# 32. Current build automation caveat

An Android Preview APK GitHub workflow was introduced, but GitHub-hosted EAS build requires an Expo token/authorization.

If CI lacks `EXPO_TOKEN`, do not treat the workflow failure as an app-code failure.

The user can build from their authenticated local Expo/EAS account when required.

Do not request credentials to be pasted into chat.

---

# 33. Design tone

The user likes:
- polished;
- compact;
- visually clear;
- modern mobile UI;
- meaningful animation;
- not too much clutter.

Theme decoration should enrich the app without hiding productivity information.

Reward animation should feel rewarding but not interrupt every interaction.

---

# 34. Engineering principles for this repository

- Preserve SQLite data compatibility.
- Prefer additive migrations over destructive schema resets.
- Avoid rewriting large stable files for tiny UI changes when a small patch is enough.
- Prevent double-tap / duplicate settlement at repository level where money/reward state is involved.
- UI disabling is helpful but should not be the only integrity protection.
- Keep external Calendar read-only unless product requirements explicitly change.
- Keep app-local schedules separate from external Calendar.
- When fixing one user-reported bug, check neighboring flows for the same structural cause.

---

# 35. Short current mission for the next Codex session

Start from current `main`.

First finish the current UX/regression batch:

1. Fix Tasks tap/Pressable regression.
2. Add optional DDL picker to Task creation.
3. Show `super_difficult` as `Xhard`.
4. Rename `NEW RANDOM TASK` → `NEW TASK`.
5. Use clear `Estimated time` wording.
6. Expose Scheduled Routine removal.
7. Remove Themes bottom tab.
8. Make Today theme avatar tappable.
9. Open compact theme picker from Today.
10. Preserve 10 Coin / 7 day theme rental.
11. Ensure theme rental appears as `Theme rental · -10 Coin` in Settlement Ledger.
12. Run static checks.
13. Run Android virtual-device behavioral tests.
14. Fix failures found by those tests.
15. Build and identify the new APK.

Work autonomously until this batch is completed or a real external blocker requires the user.

---

# 36. One-line prompt for a fresh Codex session

Use:

> Read `CODEX_HANDOFF.md` completely before changing code. Continue from current `main`. Preserve the frozen product rules, complete the “Short current mission,” and do not declare success until both build checks and Android behavioral validation are done. Work autonomously unless credentials, irreversible data loss, or a genuinely product-changing ambiguity requires me.
