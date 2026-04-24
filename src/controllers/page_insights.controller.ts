import type { NextFunction, Request, Response } from "express";
import { BaseController } from "../core/base.controller";
import pageInsightsService from "../services/page/page_insights.service";
import { ResponseFormatter } from "../utils/formatter";

export class PageInsightsController extends BaseController {
  getPageInsights = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { fbPageId, since, until } = req.params as Record<string, string>;
      const insights = await pageInsightsService.getPageInsights(fbPageId, { since, until });

      if (!insights || insights.length === 0) {
        return this.notFound(res, "Page insights not found");
      }

      const formattedInsights = ResponseFormatter.formatPageInsights(fbPageId, insights as never);
      return this.ok(res, formattedInsights, "Page insights retrieved successfully");
    } catch (error) {
      return next(error);
    }
  };

  getPageMetrics = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { fbPageId, metricName, since, until } = req.params as Record<string, string>;
      const metrics = await pageInsightsService.getPageMetrics(fbPageId, metricName, { since, until });

      if (!metrics || metrics.length === 0) {
        return this.notFound(res, "Page metrics not found");
      }

      const formattedMetrics = ResponseFormatter.formatPageInsights(fbPageId, metrics as never);
      return this.ok(res, formattedMetrics, "Page metrics retrieved successfully");
    } catch (error) {
      return next(error);
    }
  };

  createPageInsight = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { fbPageId } = req.params as Record<string, string>;
      const insightData = req.body as Record<string, unknown>;
      const insight = await pageInsightsService.createPageInsight(insightData as never);
      const formattedInsight = ResponseFormatter.formatPageInsights(fbPageId || (insightData.page_id as string), [insight as never]);
      return this.created(res, formattedInsight, "Page insight created successfully");
    } catch (error) {
      return next(error);
    }
  };
}

export default new PageInsightsController();
