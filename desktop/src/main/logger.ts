import { appendFileSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs'
import { basename, join } from 'node:path'

export class AppLogger {
  constructor(private readonly directory: string) { mkdirSync(directory, { recursive: true }); this.prune() }
  info(message: string): void { this.write('INFO', message) }
  error(message: string, error?: unknown): void {
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : error ? String(error) : ''
    this.write('ERROR', `${message}${detail ? ` | ${detail}` : ''}`)
  }
  private write(level: string, message: string): void {
    const date = new Date().toISOString().slice(0, 10)
    const safe = message.replaceAll(process.env.USERPROFILE ?? '__never__', '<user>').replace(/[\r\n]+/g, ' ').slice(0, 2000)
    appendFileSync(join(this.directory, `ai-reset-alert-${date}.log`), `${new Date().toISOString()} ${level} ${safe}\n`, 'utf8')
  }
  private prune(): void {
    const files = readdirSync(this.directory).filter((name) => /^ai-reset-alert-\d{4}-\d{2}-\d{2}\.log$/.test(name))
      .map((name) => ({ name, time: statSync(join(this.directory, name)).mtimeMs })).sort((a, b) => b.time - a.time)
    for (const file of files.slice(14)) unlinkSync(join(this.directory, basename(file.name)))
  }
}
