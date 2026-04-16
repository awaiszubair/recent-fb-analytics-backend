import type { NextFunction, Request, Response } from "express";
import { BaseController } from "../core/base.controller";
import postInsightsService from "../services/post_insights.service";
import { ResponseFormatter } from "../utils/formatter";

export class PostInsightsController extends BaseController {
  getPostInsights = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { postId: fbPostId, since, until } = req.params as Record<string, string>;
      const insights = await postInsightsService.getPostInsights(fbPostId, { since, until });

      if (!insights || insights.length === 0) {
        return this.notFound(res, "Post insights not found");
      }

      const formattedInsights = ResponseFormatter.formatPostInsights(fbPostId, insights as never);
      return this.ok(res, formattedInsights, "Post insights retrieved successfully");
    } catch (error) {
      return next(error);
    }
  };

  getPostMetrics = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { postId: fbPostId, metricName, since, until } = req.params as Record<string, string>;
      const metrics = await postInsightsService.getPostMetrics(fbPostId, metricName, { since, until });

      if (!metrics || metrics.length === 0) {
        return this.notFound(res, "Post metrics not found");
      }

      const formattedMetrics = ResponseFormatter.formatPostInsights(fbPostId, metrics as never);
      return this.ok(res, formattedMetrics, "Post metrics retrieved successfully");
    } catch (error) {
      return next(error);
    }
  };

  createPostInsight = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const insightData = req.body as Record<string, unknown>;
      const insight = await postInsightsService.createPostInsight(insightData as never);
      const formattedInsight = ResponseFormatter.formatPostInsights(insightData.post_id as string, [insight as never]);
      return this.created(res, formattedInsight, "Post insight created successfully");
    } catch (error) {
      return next(error);
    }
  };
}

export default new PostInsightsController();
