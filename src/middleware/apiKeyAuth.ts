import type { NextFunction, Request, Response } from "express";
import { Environment } from "../config/environment";

const readHeaderValue = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return value || "";
};

export const apiKeyAuth = (req: Request, res: Response, next: NextFunction): Response | void => {
  const expectedApiKey = Environment.revenueExportApiKey;

  if (!expectedApiKey) {
    return res.status(500).json({
      success: false,
      message: "Revenue export API key is not configured",
    });
  }

  const providedApiKey = readHeaderValue(req.headers["x-api-key"]);

  if (!providedApiKey || providedApiKey !== expectedApiKey) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  return next();
};

export default apiKeyAuth;
