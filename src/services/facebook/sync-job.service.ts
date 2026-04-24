import syncJobRepository from "../../repositories/SyncJob";
import type { SyncJobCreateInput, SyncJobEntity } from "../../types/domain";

export class SyncJobService {
  createSyncJob(pageId: string, jobType: string): Promise<SyncJobEntity> {
    return syncJobRepository.createSyncJob({
      page_id: pageId,
      job_type: jobType,
      status: "pending",
      started_at: new Date(),
    });
  }

  updateSyncJob(jobId: string, status: string, errorLog: string | null = null): Promise<SyncJobEntity> {
    return syncJobRepository.updateSyncJob(jobId, {
      status,
      error_log: errorLog,
      completed_at: ["completed", "failed"].includes(status) ? new Date() : undefined,
    } as Partial<SyncJobCreateInput>);
  }
}

export default new SyncJobService();
