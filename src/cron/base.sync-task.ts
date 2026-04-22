/**
 * BaseSyncTask
 * -----------
 * Abstract base for all cron sync tasks (full sync + incremental sync).
 * Provides shared date helpers and a consistent logging prefix.
 * Tasks extend this and implement execute().
 */
export abstract class BaseSyncTask {
  protected abstract readonly taskName: string;

  /** Returns ISO string for N days ago from now */
  protected getWindowStart(days: number): string {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  }

  /** Returns a Date object for yesterday at UTC midnight */
  protected getYesterday(): Date {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 1);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  /** Returns ISO string for yesterday's start (for API since param) */
  protected getYesterdayIso(): string {
    return this.getYesterday().toISOString();
  }

  /** Returns ISO string for today (for API until param) */
  protected getTodayIso(): string {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d.toISOString();
  }

  protected log(msg: string, data?: Record<string, unknown>): void {
    console.log(`[cron][${this.taskName}] ${msg}`, data ?? "");
  }

  protected warn(msg: string, data?: Record<string, unknown>): void {
    console.warn(`[cron][${this.taskName}] ⚠️  ${msg}`, data ?? "");
  }

  protected error(msg: string, err?: unknown): void {
    console.error(`[cron][${this.taskName}] ❌ ${msg}`, err ?? "");
  }
}
