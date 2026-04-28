import { getDB } from "../config/database";
import { BaseRepository } from "../core/base.repository";
import type { SyncJobCreateInput, SyncJobEntity } from "../types/domain";

export class SyncJobRepository extends BaseRepository<SyncJobEntity> {
  protected readonly tableName = "sync_jobs";

  protected get delegate() {
    return getDB().syncJob;
  }

  createSyncJob(jobData: SyncJobCreateInput): Promise<SyncJobEntity> {
    return this.createRecord({
      ...jobData,
      status: jobData.status || "pending",
    });
  }

  getPageSyncJobs(pageId: string): Promise<SyncJobEntity[]> {
    return this.findManyRecords({
      where: { page_id: pageId },
      orderBy: { created_at: "desc" },
    });
  }

  updateSyncJob(jobId: string, updates: Partial<SyncJobCreateInput>): Promise<SyncJobEntity> {
    return this.updateRecord({ id: jobId }, updates);
  }

  getRecentJobsByType(pageId: string, jobType: string): Promise<SyncJobEntity[]> {
    return this.findManyRecords({
      where: {
        page_id: pageId,
        job_type: jobType,
      },
      orderBy: { created_at: "desc" },
      take: 5,
    });
  }

  async getLatestCompletedByPageIds(pageIds: string[]): Promise<Map<string, SyncJobEntity>> {
    if (pageIds.length === 0) {
      return new Map();
    }

    const jobs = await this.findManyRecords({
      where: {
        page_id: { in: pageIds } as never,
        status: "completed",
      },
      orderBy: { completed_at: "desc" },
    });

    const latestByPage = new Map<string, SyncJobEntity>();

    for (const job of jobs) {
      if (!latestByPage.has(job.page_id)) {
        latestByPage.set(job.page_id, job);
      }
    }

    return latestByPage;
  }
}

export default new SyncJobRepository();
