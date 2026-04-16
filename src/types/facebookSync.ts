import type { ConnectedPageEntity, PartnerEntity, PostEntity } from "./domain";
import type { FacebookPage } from "./facebook";

export interface InitialConnectionSyncResult {
  partner: PartnerEntity | null;
  pagesQueued: number;
  queuedPages: Array<{
    fbPageId: string;
    pageName?: string | null;
    jobId?: string | null;
  }>;
  errors: Array<{
    pageId: string;
    error: string;
  }>;
}

export interface PageSyncJobPayload {
  partnerId: string;
  accessToken: string;
  facebookPage: FacebookPage;
  syncWindowDays?: number;
  postBatchSize?: number;
  postWriteChunkSize?: number;
  pageMetrics?: string[];
  postMetrics?: string[];
}

export interface PostSyncJobPayload {
  pageId: string;
  postId: string;
  fbPostId: string;
  accessToken: string;
}

export interface PageSyncJobResult {
  page: ConnectedPageEntity;
  postsSaved: number;
  postsQueued: number;
  pageInsightsSaved: number;
}

export interface PostSyncJobResult {
  post: PostEntity;
  insightsSaved: number;
}
