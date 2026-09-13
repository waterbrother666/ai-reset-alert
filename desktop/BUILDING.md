# Desktop builds

Install Node.js 22 or newer, then run `npm ci` in this directory. Use `npm run dev`
for development, `npm test` for unit tests, `npm run build` for compiled output,
and `npm run dist` on the target operating system to produce installers.
Native SQLite is rebuilt explicitly for Electron before packaging because a normal
Node.js test run and Electron use different module ABIs. Run `npm rebuild
better-sqlite3` if you want to run Node tests again immediately after packaging.

Windows builds produce an x64 NSIS installer. Release signing is intentionally
environment-driven, so signing credentials belong in CI secrets. Automatic updates
are deferred until a signed release channel exists.

The renderer build reuses the web application at the repository root. Electron
exposes `window.desktopApi`, while browser builds keep using the API fallback.
