# Monitor engine

The monitor reads the public AIHOT Codex reset snapshot:

`GET https://aihot.news/api/v1/codex-resets`

It validates the versioned JSON contract, stores the complete current event snapshot
in SQLite, and emits notifications for new events or meaningful status transitions.
The first successful sync is a quiet baseline. Later requests use `If-None-Match`,
honor `Retry-After`, and remove events withdrawn from the upstream snapshot.

Electron injects `net.fetch`, so requests follow the user's Chromium/system proxy.
The source remains restricted to HTTPS and the `aihot.news` allowlist.

```ts
import { createMonitorEngine } from './src/monitor'

const engine = createMonitorEngine()
await engine.initialize({ databasePath: '/path/to/monitor.sqlite' })
engine.on('signal', async (record) => {
  const sent = await platformNotifications.send(record)
  await engine.markNotificationResult(record.id, { sent })
})
await engine.checkNow()
```

Runtime dependency: `better-sqlite3`.
