import axios from "axios";
import type { Request, Response } from "express";
import { BaseController } from "../core/base.controller";
import connectedPageRepository from "../repositories/ConnectedPage";
import insightsService from "../services/insights.service";
import { ResponseFormatter } from "../utils/formatter";
import { SeedService } from "../utils/seed";
import { validateData } from "../utils/schema";

export class ExamplesController extends BaseController {
  getAndSavePageInsights = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { pageId } = req.params as Record<string, string>;
      const body = req.body as { metrics?: string[]; access_token?: string; db_page_id?: string };

      if (!pageId) {
        return this.badRequest(res, "Page ID is required");
      }

      const insightResult = await insightsService.getPageInsights(pageId, body.metrics || ["page_impressions"], {
        access_token: body.access_token,
      } as never);

      const dbPageId = body.db_page_id || "actual-page-uuid-from-db";
      const formattedInsights = ResponseFormatter.formatPageInsights(pageId, insightResult.data as never);
      const savedInsights: unknown[] = [];

      for (const insight of formattedInsights) {
        const validation = validateData("page_insights", {
          page_id: dbPageId,
          metric_name: insight.metric_name,
          metric_value: insight.metric_value,
          period: insight.period,
          end_time: insight.end_time,
        });

        if (!validation.valid) {
          console.warn("Insight validation warning:", validation.errors);
        }

        const saved = await SeedService.insertPageInsight({
          page_id: dbPageId,
          metric_name: insight.metric_name,
          metric_value: insight.metric_value,
          period: insight.period,
          end_time: insight.end_time,
        });
        savedInsights.push(saved);
      }

      return this.ok(
        res,
        {
          fetched: formattedInsights.length,
          saved: savedInsights.length,
          insights: savedInsights,
        },
        "Page insights fetched and saved successfully"
      );
    } catch (error) {
      return this.fail(res, error instanceof Error ? error.message : String(error), 500, error);
    }
  };

  getAndSavePostMetadata = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { postId } = req.params as Record<string, string>;
      const body = req.body as { access_token?: string; db_post_id?: string };

      if (!postId) {
        return this.badRequest(res, "Post ID is required");
      }

      const dbPostId = body.db_post_id || "actual-post-uuid-from-db";
      const results: Record<string, unknown> = {};

      try {
        const commentsResult = await insightsService.getPostCommentsCount(postId, { access_token: body.access_token } as never);
        if (commentsResult.success) {
          await SeedService.insertPostInsight({
            post_id: dbPostId,
            metric_name: "comments.summary.total_count",
            metric_value: commentsResult.data,
          });
          results.comments = commentsResult.data;
        }
      } catch (error) {
        console.error("Error fetching comments:", error);
      }

      try {
        const sharesResult = await insightsService.getPostSharesCount(postId, { access_token: body.access_token } as never);
        if (sharesResult.success) {
          await SeedService.insertPostInsight({
            post_id: dbPostId,
            metric_name: "shares.count",
            metric_value: sharesResult.data,
          });
          results.shares = sharesResult.data;
        }
      } catch (error) {
        console.error("Error fetching shares:", error);
      }

      return this.ok(res, results, "Post metadata fetched and saved successfully");
    } catch (error) {
      return this.fail(res, error instanceof Error ? error.message : String(error), 500, error);
    }
  };

  syncPageDetails = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { pageId } = req.params as Record<string, string>;
      const body = req.body as { fb_page_id?: string; access_token?: string; partner_id?: string };

      if (!pageId) {
        return this.badRequest(res, "Page ID is required");
      }

      if (!body.fb_page_id || !body.access_token) {
        return this.badRequest(res, "fb_page_id and access_token required");
      }

      const graphBase = process.env.FACEBOOK_GRAPH_BASE_URL || "https://graph.facebook.com/v25.0";
      const pageDetails = await axios.get(`${graphBase}/${body.fb_page_id}`, {
        params: {
          access_token: body.access_token,
          fields: "id,name,fan_count",
        },
        timeout: 30000,
      });

      const formattedPage = ResponseFormatter.formatConnectedPage(body.partner_id || pageId, pageDetails.data);
      const updated = await connectedPageRepository.updatePage(pageId, formattedPage);

      return this.ok(res, updated, "Page details synced successfully");
    } catch (error) {
      return this.fail(res, error instanceof Error ? error.message : String(error), 500, error);
    }
  };
}

export default new ExamplesController();
