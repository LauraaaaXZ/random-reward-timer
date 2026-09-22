import { getDatabase } from './database';

export async function migrateDatabase() {
  const db = await getDatabase();
  await db.execAsync(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY NOT NULL,name TEXT NOT NULL,estimated_minutes INTEGER NOT NULL CHECK (estimated_minutes > 0),remaining_minutes INTEGER NOT NULL CHECK (remaining_minutes >= 0),difficulty TEXT NOT NULL CHECK (difficulty IN ('easy','medium','hard','super_difficult')),status TEXT NOT NULL CHECK (status IN ('active','locked','completed','archived')),deadline_at TEXT,final_work_window_at TEXT,preferred_today INTEGER NOT NULL DEFAULT 0,avoidance_count INTEGER NOT NULL DEFAULT 0,recovery_stack REAL NOT NULL DEFAULT 0,created_at TEXT NOT NULL,completed_at TEXT);
    CREATE TABLE IF NOT EXISTS task_dependencies (prerequisite_task_id TEXT NOT NULL,dependent_task_id TEXT NOT NULL,PRIMARY KEY (prerequisite_task_id, dependent_task_id),FOREIGN KEY (prerequisite_task_id) REFERENCES tasks(id) ON DELETE CASCADE,FOREIGN KEY (dependent_task_id) REFERENCES tasks(id) ON DELETE CASCADE,CHECK (prerequisite_task_id <> dependent_task_id));
    CREATE TABLE IF NOT EXISTS daily_task_rules (task_id TEXT PRIMARY KEY NOT NULL,pool_mode TEXT NOT NULL CHECK (pool_mode IN ('fragment','easy_pool','both')),last_completed_local_date TEXT,FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS focus_sessions (id TEXT PRIMARY KEY NOT NULL,task_id TEXT NOT NULL,pool TEXT NOT NULL,draw_mode TEXT NOT NULL,commitment_minutes INTEGER NOT NULL,actual_minutes INTEGER,started_at TEXT,ended_at TEXT,FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS calendar_blocks (id TEXT PRIMARY KEY NOT NULL,title TEXT NOT NULL,start_at TEXT NOT NULL,end_at TEXT NOT NULL,kind TEXT NOT NULL CHECK (kind IN ('calendar','sleep','meal','dnd','recovery')),CHECK (end_at > start_at));
    CREATE TABLE IF NOT EXISTS external_calendar_events (provider TEXT NOT NULL,external_id TEXT NOT NULL,title TEXT NOT NULL,start_at TEXT NOT NULL,end_at TEXT NOT NULL,is_all_day INTEGER NOT NULL DEFAULT 0,last_modified_at TEXT,synced_at TEXT NOT NULL,PRIMARY KEY (provider, external_id),CHECK (end_at > start_at));
    CREATE TABLE IF NOT EXISTS inventory (resource_key TEXT PRIMARY KEY NOT NULL,quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS holiday_days (local_date TEXT PRIMARY KEY NOT NULL,source TEXT NOT NULL CHECK (source IN ('pass','draw','grant','annual_leave','comp_leave')),created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS weekly_holiday_grants (week_key TEXT PRIMARY KEY NOT NULL, granted_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS weekly_holiday_passes (week_key TEXT PRIMARY KEY NOT NULL,granted_at TEXT NOT NULL,expires_at TEXT NOT NULL,extended INTEGER NOT NULL DEFAULT 0 CHECK (extended IN (0,1)),used_at TEXT);
    CREATE TABLE IF NOT EXISTS annual_leave_accounts (year INTEGER PRIMARY KEY NOT NULL,base_days REAL NOT NULL DEFAULT 20,level_bonus_days REAL NOT NULL DEFAULT 0,comp_days REAL NOT NULL DEFAULT 0,used_days REAL NOT NULL DEFAULT 0,updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS annual_leave_level_awards (level INTEGER PRIMARY KEY NOT NULL,awarded_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS holiday_work_log (local_date TEXT PRIMARY KEY NOT NULL,worked_minutes INTEGER NOT NULL DEFAULT 0,comp_days_awarded REAL NOT NULL DEFAULT 0,updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS wallet (id INTEGER PRIMARY KEY CHECK (id = 1),coin INTEGER NOT NULL DEFAULT 0,xp INTEGER NOT NULL DEFAULT 0,level INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS reward_events (id TEXT PRIMARY KEY NOT NULL,session_id TEXT,source TEXT NOT NULL,coin_delta INTEGER NOT NULL DEFAULT 0,xp_delta INTEGER NOT NULL DEFAULT 0,multiplier REAL NOT NULL DEFAULT 1,created_at TEXT NOT NULL,FOREIGN KEY (session_id) REFERENCES focus_sessions(id) ON DELETE SET NULL);
    CREATE TABLE IF NOT EXISTS prize_progress (id INTEGER PRIMARY KEY CHECK (id = 1),lifetime_draws INTEGER NOT NULL DEFAULT 0,draws_since_ultimate INTEGER NOT NULL DEFAULT 0,ultimate_claims INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL);
    INSERT OR IGNORE INTO wallet (id,coin,xp,level,updated_at) VALUES (1,0,0,1,datetime('now'));
    INSERT OR IGNORE INTO inventory (resource_key,quantity,updated_at) VALUES ('holiday_pass',0,datetime('now'));
    INSERT OR IGNORE INTO prize_progress (id,lifetime_draws,draws_since_ultimate,ultimate_claims,updated_at) VALUES (1,0,0,0,datetime('now'));
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline_at);
    CREATE INDEX IF NOT EXISTS idx_dependencies_dependent ON task_dependencies(dependent_task_id);
    CREATE INDEX IF NOT EXISTS idx_daily_rules_completed ON daily_task_rules(last_completed_local_date);
    CREATE INDEX IF NOT EXISTS idx_calendar_blocks_time ON calendar_blocks(start_at,end_at);
    CREATE INDEX IF NOT EXISTS idx_external_calendar_time ON external_calendar_events(start_at,end_at);
    CREATE INDEX IF NOT EXISTS idx_reward_events_session ON reward_events(session_id);
  `);
}
