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
}

export default new SyncJobRepository();
