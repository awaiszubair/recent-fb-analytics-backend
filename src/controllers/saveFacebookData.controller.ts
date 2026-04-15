import type { Request, Response } from "express";
import { BaseController } from "../core/base.controller";
import saveFacebookDataService from "../services/saveFacebookData.service";

export class SaveFacebookDataController extends BaseController {
  initialConnectionSync = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const body = req.body as { access_token?: string; accessToken?: string };
      const authReq = req as Request & { facebookAuth?: { userLongToken?: string } };
      const accessToken = body.access_token || body.accessToken || authReq.facebookAuth?.userLongToken;

      if (!accessToken) {
        return this.badRequest(res, "access_token is required");
      }

      const result = await saveFacebookDataService.initialConnectionSync(accessToken);
      return this.ok(res, result, "Initial connection sync complete");
    } catch (error) {
      return this.fail(res, error instanceof Error ? error.message : String(error), 500, error);
    }
  };

  syncPartner = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { access_token } = req.body as { access_token?: string };

      if (!access_token) {
        return this.badRequest(res, "access_token is required");
      }

      const partner = await saveFacebookDataService.syncPartner(access_token);
      return this.ok(res, partner, "Partner synced");
    } catch (error) {
      return this.fail(res, error instanceof Error ? error.message : String(error), 500, error);
    }
  };

  syncPage = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const body = req.body as {
        partner_id?: string;
        fb_page_id?: string;
        page_name?: string;
        page_token_encrypted?: string;
        fan_count?: number | string | bigint;
      };

      if (!body.partner_id || !body.fb_page_id) {
        return this.badRequest(res, "partner_id and fb_page_id are required");
      }

      const page = await saveFacebookDataService.syncPage({
        partner_id: body.partner_id,
        fb_page_id: body.fb_page_id,
        page_name: body.page_name,
        page_token_encrypted: body.page_token_encrypted,
        fan_count: body.fan_count || 0,
        is_active: true,
        last_synced_at: new Date(),
      });

      return this.ok(res, page, "Page synced");
    } catch (error) {
      return this.fail(res, error instanceof Error ? error.message : String(error), 500, error);
    }
  };

  syncPost = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const body = req.body as {
        page_id?: string;
        fb_post_id?: string;
        message?: string;
        type?: string;
        permalink?: string;
        created_time?: string;
      };

      if (!body.page_id || !body.fb_post_id) {
        return this.badRequest(res, "page_id and fb_post_id are required");
      }

      const post = await saveFacebookDataService.syncPost({
        page_id: body.page_id,
        fb_post_id: body.fb_post_id,
        message: body.message,
        type: body.type,
        permalink: body.permalink,
        created_time: body.created_time,
      });

      return this.ok(res, post, "Post synced");
    } catch (error) {
      return this.fail(res, error instanceof Error ? error.message : String(error), 500, error);
    }
  };

  syncPageInsights = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const body = req.body as {
        page_id?: string;
        db_page_id?: string;
        facebook_page_id?: string;
        access_token?: string;
        metrics?: string[];
        period?: string;
        since?: string;
        until?: string;
      };

      const pageId = body.db_page_id || body.page_id;
      const facebookPageId = body.facebook_page_id || body.page_id;

      if (!pageId || !facebookPageId || !body.access_token) {
        return this.badRequest(res, "page_id/facebook_page_id and access_token are required");
      }

      const insights = await saveFacebookDataService.syncPageInsights({
        pageId,
        facebookPageId,
        accessToken: body.access_token,
        metrics: body.metrics,
        period: body.period,
        since: body.since,
        until: body.until,
      });

      return this.ok(res, { count: insights.length }, `${insights.length} page insights synced`);
    } catch (error) {
      return this.fail(res, error instanceof Error ? error.message : String(error), 500, error);
    }
  };

  syncPostInsights = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const body = req.body as {
        post_id?: string;
        db_post_id?: string;
        fb_post_id?: string;
        access_token?: string;
        metrics?: string[];
      };

      const postId = body.db_post_id || body.post_id;
      const facebookPostId = body.fb_post_id || body.post_id;

      if (!postId || !facebookPostId || !body.access_token) {
        return this.badRequest(res, "post_id/fb_post_id and access_token are required");
      }

      const insights = await saveFacebookDataService.syncPostInsights({
        postId,
        facebookPostId,
        accessToken: body.access_token,
        metrics: body.metrics,
      });

      return this.ok(res, { count: insights.length }, `${insights.length} post insights synced`);
    } catch (error) {
      return this.fail(res, error instanceof Error ? error.message : String(error), 500, error);
    }
  };

  syncPageEarnings = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const body = req.body as {
        page_id?: string;
        earnings_amount?: number | string | bigint;
        approximate_earnings?: number | string | bigint;
        currency?: string;
        period?: string;
        end_time?: string;
        content_type_breakdown?: unknown;
      };

      if (!body.page_id) {
        return this.badRequest(res, "page_id is required");
      }

      const earnings = await saveFacebookDataService.syncPageEarnings({
        page_id: body.page_id,
        earnings_amount: body.earnings_amount || 0,
        approximate_earnings: body.approximate_earnings || 0,
        currency: body.currency || "USD",
        period: body.period,
        end_time: body.end_time ? new Date(body.end_time) : undefined,
        content_type_breakdown: body.content_type_breakdown as never,
        synced_at: new Date(),
      });

      return this.ok(res, earnings, "Page earnings synced");
    } catch (error) {
      return this.fail(res, error instanceof Error ? error.message : String(error), 500, error);
    }
  };

  syncPostEarnings = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const body = req.body as {
        post_id?: string;
        earnings_amount?: number | string | bigint;
        approximate_earnings?: number | string | bigint;
        currency?: string;
        period?: string;
        end_time?: string;
      };

      if (!body.post_id) {
        return this.badRequest(res, "post_id is required");
      }

      const earnings = await saveFacebookDataService.syncPostEarnings({
        post_id: body.post_id,
        earnings_amount: body.earnings_amount || 0,
        approximate_earnings: body.approximate_earnings || 0,
        currency: body.currency || "USD",
        period: body.period,
        end_time: body.end_time ? new Date(body.end_time) : undefined,
        synced_at: new Date(),
      });

      return this.ok(res, earnings, "Post earnings synced");
    } catch (error) {
      return this.fail(res, error instanceof Error ? error.message : String(error), 500, error);
    }
  };

  createSyncJob = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const body = req.body as { page_id?: string; job_type?: string };

      if (!body.page_id || !body.job_type) {
        return this.badRequest(res, "page_id and job_type are required");
      }

      const job = await saveFacebookDataService.createSyncJob(body.page_id, body.job_type);
      return this.created(res, job, "Sync job created");
    } catch (error) {
      return this.fail(res, error instanceof Error ? error.message : String(error), 500, error);
    }
  };

  updateSyncJob = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { jobId } = req.params as Record<string, string>;
      const body = req.body as { status?: string; error_log?: string };

      if (!body.status) {
        return this.badRequest(res, "status is required");
      }

      const job = await saveFacebookDataService.updateSyncJob(jobId, body.status, body.error_log || null);
      return this.ok(res, job, "Sync job updated");
    } catch (error) {
      return this.fail(res, error instanceof Error ? error.message : String(error), 500, error);
    }
  };

  saveThirdPartyData = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const body = req.body as {
        page_id?: string;
        post_id?: string;
        data_type?: string;
        value?: unknown;
      };

      if (!body.data_type || (!body.page_id && !body.post_id)) {
        return this.badRequest(res, "data_type and at least one of page_id or post_id are required");
      }

      const record = await saveFacebookDataService.saveThirdPartyData(body.page_id || null, body.post_id || null, body.data_type, body.value);
      return this.created(res, record, "Third-party data saved");
    } catch (error) {
      return this.fail(res, error instanceof Error ? error.message : String(error), 500, error);
    }
  };
}

export default new SaveFacebookDataController();
