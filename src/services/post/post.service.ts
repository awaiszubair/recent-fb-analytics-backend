import { BaseService } from "../../core/base.service";
import connectedPageRepository from "../../repositories/ConnectedPage";
import postRepository from "../../repositories/Post";
import type { GraphQueryOptions, PostCreateInput, PostEntity } from "../../types/domain";
import type { FacebookPost } from "../../types/facebook";
import insightsService from "../insights.service";
import postSyncService from "../facebook/post.sync.service";
import { DEFAULT_POST_FETCH_LIMIT } from "../facebookSync.presets";
import {
  getCoverageBounds,
  getMissingWindows,
  resolveStoredToken,
  toDate,
} from "../../utils/insight-cache.helpers";

const normalizeWindowBoundary = (value: string | undefined, boundary: "since" | "until"): string | undefined => {
  if (!value) {
    return undefined;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}${boundary === "since" ? "T00:00:00.000Z" : "T23:59:59.999Z"}`;
  }

  return value;
};

export class PostService extends BaseService {
  constructor() {
    super("PostService");
  }

  createPost(postData: PostCreateInput): Promise<PostEntity> {
    return postRepository.createPost(postData);
  }

  getPostById(postId: string): Promise<PostEntity | null> {
    return postRepository.getPostById(postId);
  }

  async getPagePosts(
    pageId: string,
    options: Pick<GraphQueryOptions, "since" | "until"> = {}
  ): Promise<PostEntity[]> {
    const normalizedSince = normalizeWindowBoundary(options.since, "since");
    const normalizedUntil = normalizeWindowBoundary(options.until, "until");
    const requestedSince = toDate(normalizedSince);
    const requestedUntil = toDate(normalizedUntil);

    if (!requestedSince || !requestedUntil) {
      return postRepository.getPagePosts(pageId, {
        since: normalizedSince,
        until: normalizedUntil,
      });
    }

    const dbOptions = {
      since: normalizedSince || requestedSince.toISOString(),
      until: normalizedUntil || requestedUntil.toISOString(),
    };

    const existing = await postRepository.getPagePosts(pageId, dbOptions);
    const coverage = getCoverageBounds(existing.map((post) => ({ end_time: post.created_time ?? null })));
    const missingWindows = getMissingWindows(requestedSince, requestedUntil, coverage);

    if (missingWindows.length === 0) {
      return existing;
    }

    const connectedPage = await connectedPageRepository.getPageByFbPageId(pageId);
    const accessToken = resolveStoredToken(connectedPage?.page_token_encrypted);

    if (!accessToken) {
      throw new Error(`No stored token found for page ${pageId}`);
    }

    for (const window of missingWindows) {
      const response = await insightsService.getPagePosts(pageId, {
        access_token: accessToken,
        since: window.since,
        until: window.until,
        limit: DEFAULT_POST_FETCH_LIMIT,
        fetchAll: true,
      });

      for (const post of response.data as FacebookPost[]) {
        if (!post?.id) {
          continue;
        }

        await postSyncService.syncPost({
          page_id: pageId,
          fb_post_id: post.id,
          message: post.message,
          type: post.status_type,
          full_picture: post.full_picture || null,
          comments_count: post.comments?.summary?.total_count || 0,
          shares_count: post.shares?.count || 0,
          permalink: post.permalink_url,
          created_time: post.created_time,
        });
      }
    }

    return postRepository.getPagePosts(pageId, dbOptions);
  }
}

export default new PostService();
