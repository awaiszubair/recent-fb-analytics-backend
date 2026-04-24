import type {
  InitialConnectionSyncResult,
  PageSyncJobPayload,
  PageSyncJobResult,
  PostSyncJobPayload,
  PostSyncJobResult,
} from "../types/facebookSync";
import orchestrator from "./facebook/sync.orchestrator";

export class SaveFacebookDataService {
  initialConnectionSync(accessToken: string): Promise<InitialConnectionSyncResult> {
    return orchestrator.initialConnectionSync(accessToken);
  }

  processPageSyncJob(payload: PageSyncJobPayload): Promise<PageSyncJobResult> {
    return orchestrator.processPageSyncJob(payload);
  }

  processPostSyncJob(payload: PostSyncJobPayload): Promise<PostSyncJobResult> {
    return orchestrator.processPostSyncJob(payload);
  }
}

export default new SaveFacebookDataService();
