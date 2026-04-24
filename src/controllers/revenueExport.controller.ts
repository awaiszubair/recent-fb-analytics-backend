import type { Request, Response } from "express";
import revenueExportService, { RevenueExportError } from "../services/revenueExport.service";

const firstQueryValue = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

export class RevenueExportController {
  getRevenueExport = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const query = req.query as Record<string, string | string[] | undefined>;
      const startDate = firstQueryValue(query.start_date);
      const endDate = firstQueryValue(query.end_date);
      const partner = firstQueryValue(query.partner);

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: "start_date and end_date are required",
        });
      }

      const revenue = await revenueExportService.exportRevenue({
        startDate,
        endDate,
        partner,
      });

      return res.status(200).json(revenue);
    } catch (error) {
      const statusCode = error instanceof RevenueExportError ? error.statusCode : 500;
      const message = error instanceof Error ? error.message : "Revenue export failed";

      return res.status(statusCode).json({
        success: false,
        message,
      });
    }
  };
}

export default new RevenueExportController();
