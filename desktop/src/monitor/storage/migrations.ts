import type Database from 'better-sqlite3'

const MIGRATIONS = [
  `
  CREATE TABLE settings (
    key TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE tweets (
    id TEXT PRIMARY KEY, username TEXT NOT NULL, text TEXT NOT NULL,
    created_at TEXT, url TEXT NOT NULL, first_observed_at TEXT NOT NULL, source TEXT NOT NULL
  );
  CREATE TABLE analyses (
    id TEXT PRIMARY KEY, tweet_id TEXT NOT NULL UNIQUE, relevant INTEGER NOT NULL,
    category TEXT NOT NULL, confidence TEXT NOT NULL, claim TEXT NOT NULL,
    reset_mechanism TEXT, plans_json TEXT NOT NULL, keywords_json TEXT NOT NULL,
    analyzed_at TEXT NOT NULL, notification_status TEXT NOT NULL,
    notification_sent_at TEXT, notification_error TEXT,
    FOREIGN KEY(tweet_id) REFERENCES tweets(id)
  );
  CREATE TABLE source_health (
    url TEXT PRIMARY KEY, last_attempt_at TEXT, last_success_at TEXT, last_error TEXT
  );
  CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE INDEX analyses_history_idx ON analyses(analyzed_at DESC, id DESC);
  `,
  `ALTER TABLE analyses ADD COLUMN notification_attempts INTEGER NOT NULL DEFAULT 0;`,
  `
  CREATE TABLE reset_events (
    event_id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    label TEXT NOT NULL,
    status TEXT NOT NULL,
    title TEXT NOT NULL,
    scope TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    confirmed_at TEXT,
    occurred_on TEXT,
    confirmation_basis TEXT,
    schedule_json TEXT,
    posts_json TEXT NOT NULL,
    event_url TEXT NOT NULL,
    source TEXT NOT NULL,
    first_observed_at TEXT NOT NULL,
    notification_status TEXT NOT NULL,
    notification_sent_at TEXT,
    notification_error TEXT,
    notification_attempts INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX reset_events_history_idx ON reset_events(created_at DESC, event_id DESC);
  DELETE FROM settings WHERE key IN ('username', 'recentBackfillHours');
  DROP TABLE analyses;
  DROP TABLE tweets;
  `,
]

export function migrate(database: Database.Database): void {
  database.pragma('foreign_keys = ON')
  database.pragma('journal_mode = WAL')
  const version = Number(database.pragma('user_version', { simple: true }))
  if (version > MIGRATIONS.length) throw new Error(`Database schema ${version} is newer than supported ${MIGRATIONS.length}`)
  for (let index = version; index < MIGRATIONS.length; index += 1) {
    database.transaction(() => {
      database.exec(MIGRATIONS[index])
      database.pragma(`user_version = ${index + 1}`)
    })()
  }
}
