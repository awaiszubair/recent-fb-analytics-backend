import type { NextFunction, Request, Response } from "express";
import { BaseController } from "../core/base.controller";
import insightsService from "../services/insights.service";
import { ResponseFormatter } from "../utils/formatter";

export class InsightsController extends BaseController {
  getPageInsights = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { pageId, since, until } = req.params as Record<string, string>;
      const { metrics, access_token, period } = req.body as {
        metrics?: string[] | string;
        access_token?: string;
        period?: string;
      };

      if (!pageId) {
        return this.badRequest(res, "Page ID is required");
      }

      if (!metrics) {
        return this.badRequest(res, "Metrics are required (comma-separated string or array)");
      }

      if (!access_token) {
        return this.badRequest(res, "Access token is required");
      }

      const metricArray = Array.isArray(metrics) ? metrics : metrics.split(",").map((metric) => metric.trim());
      const result = await insightsService.getPageInsights(pageId, metricArray, {
        access_token,
        period,
        since,
        until,
      });

      const formattedData = ResponseFormatter.formatPageInsights(pageId, result.data as never);

      return this.ok(
        res,
        {
          pageId,
          metrics: metricArray,
          period,
          formatted_count: formattedData.length,
          data: formattedData,
        },
        "Page insights retrieved successfully"
      );
    } catch (error) {
      return this.fail(res, error instanceof Error ? error.message : String(error), 500, error);
    }
  };

  getPostInsights = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { postId, since, until } = req.params as Record<string, string>;
      const { metrics, access_token } = req.body as {
        metrics?: string[] | string;
        access_token?: string;
      };

      if (!postId) {
        return this.badRequest(res, "Post ID is required");
      }

      if (!metrics) {
        return this.badRequest(res, "Metrics are required (comma-separated string or array)");
      }

      if (!access_token) {
        return this.badRequest(res, "Access token is required");
      }

      const metricArray = Array.isArray(metrics) ? metrics : metrics.split(",").map((metric) => metric.trim());
      const result = await insightsService.getPostInsights(postId, metricArray, {
        access_token,
        since,
        until,
      });

      const formattedData = ResponseFormatter.formatPostInsights(postId, result.data as never);

      return this.ok(
        res,
        {
          postId,
          metrics: metricArray,
          formatted_count: formattedData.length,
          data: formattedData,
        },
        "Post insights retrieved successfully"
      );
    } catch (error) {
      return this.fail(res, error instanceof Error ? error.message : String(error), 500, error);
    }
  };

  getMultiplePageInsights = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { since, until } = req.params as Record<string, string>;
      const { pageIds, metrics, access_token, options = {} } = req.body as {
        pageIds?: string[];
        metrics?: string[];
        access_token?: string;
        options?: Record<string, unknown>;
      };

      if (!pageIds || !Array.isArray(pageIds) || pageIds.length === 0) {
        return this.badRequest(res, "pageIds array is required and must not be empty");
      }

      if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
        return this.badRequest(res, "metrics array is required and must not be empty");
      }

      if (!access_token) {
        return this.badRequest(res, "Access token is required");
      }

      const result = await insightsService.getMultiplePageInsights(pageIds, metrics, {
        access_token,
        since,
        until,
        ...options,
      });

      const formattedResults = result.map((item) => {
        if (item.success && item.data) {
          return {
            ...item,
            data: ResponseFormatter.formatPageInsights(item.pageId || "", item.data as never),
          };
        }

        return item;
      });

      return this.ok(res, formattedResults, "Multiple page insights retrieved successfully");
    } catch (error) {
      return this.fail(res, error instanceof Error ? error.message : String(error), 500, error);
    }
  };

  getMultiplePostInsights = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { since, until } = req.params as Record<string, string>;
      const { postIds, metrics, access_token } = req.body as {
        postIds?: string[];
        metrics?: string[];
        access_token?: string;
      };

      if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
        return this.badRequest(res, "postIds array is required and must not be empty");
      }

      if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
        return this.badRequest(res, "metrics array is required and must not be empty");
      }

      if (!access_token) {
        return this.badRequest(res, "Access token is required");
      }

      const result = await insightsService.getMultiplePostInsights(postIds, metrics, {
        access_token,
        since,
        until,
      });

      const formattedResults = result.map((item) => {
        if (item.success && item.data) {
          return {
            ...item,
            data: ResponseFormatter.formatPostInsights(item.postId || "", item.data as never),
          };
        }

        return item;
      });

      return this.ok(res, formattedResults, "Multiple post insights retrieved successfully");
    } catch (error) {
      return this.fail(res, error instanceof Error ? error.message : String(error), 500, error);
    }
  };

  getAvailableMetrics = (_req: Request, res: Response): Response => {
    try {
      const metrics = insightsService.getAvailableMetrics();
      return this.ok(res, metrics, "Available metrics retrieved");
    } catch (error) {
      return this.fail(res, error instanceof Error ? error.message : String(error), 500, error);
    }
  };

  getPostCommentsCount = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { postId } = req.params as Record<string, string>;
      const { access_token } = req.body as { access_token?: string };

      if (!postId) {
        return this.badRequest(res, "Post ID is required");
      }

      if (!access_token) {
        return this.badRequest(res, "Access token is required");
      }

      const result = await insightsService.getPostCommentsCount(postId, {
        access_token,
      });

      const formattedData = ResponseFormatter.formatCommentsCount(postId, result.data as never);
      return this.ok(res, formattedData, "Post comments count retrieved successfully");
    } catch (error) {
      return this.fail(res, error instanceof Error ? error.message : String(error), 500, error);
    }
  };

  getPostSharesCount = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { postId } = req.params as Record<string, string>;
      const { access_token } = req.body as { access_token?: string };

      if (!postId) {
        return this.badRequest(res, "Post ID is required");
      }

      if (!access_token) {
        return this.badRequest(res, "Access token is required");
      }

      const result = await insightsService.getPostSharesCount(postId, {
        access_token,
      });

      const formattedData = ResponseFormatter.formatSharesCount(postId, result.data as never);
      return this.ok(res, formattedData, "Post shares count retrieved successfully");
    } catch (error) {
      return this.fail(res, error instanceof Error ? error.message : String(error), 500, error);
    }
  };

  getUserDetails = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { access_token, fields } = req.body as { access_token?: string; fields?: string };

      if (!access_token) {
        return this.badRequest(res, "Access token is required");
      }

      const result = await insightsService.getUserDetails({
        access_token,
        fields: fields || "id,name,email,picture",
      });

      const formattedData = ResponseFormatter.formatUserDetails(result.data as never);
      return this.ok(res, formattedData, "User details retrieved successfully");
    } catch (error) {
      return this.fail(res, error instanceof Error ? error.message : String(error), 500, error);
    }
  };

  healthCheck = (_req: Request, res: Response): Response => {
    try {
      return this.ok(res, { status: "healthy" }, "Insights service is healthy");
    } catch (error) {
      return this.fail(res, error instanceof Error ? error.message : String(error), 500, error);
    }
  };
}

export default new InsightsController();
