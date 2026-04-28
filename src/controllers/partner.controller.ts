import type { NextFunction, Request, Response } from "express";
import { BaseController } from "../core/base.controller";
import partnerService from "../services/partner/partner.service";
import { ResponseFormatter } from "../utils/formatter";

export class PartnerController extends BaseController {
  createPartner = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const partnerData = req.body as Record<string, unknown>;
      const partner = await partnerService.createPartner(partnerData as never);
      const formattedPartner = ResponseFormatter.formatPartner(partner as never);
      return this.created(res, formattedPartner, "Partner created successfully");
    } catch (error) {
      return next(error);
    }
  };

  getPartnerById = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { partnerId } = req.params as Record<string, string>;
      const partner = await partnerService.getPartnerById(partnerId);

      if (!partner) {
        return this.notFound(res, "Partner not found");
      }

      const formattedPartner = ResponseFormatter.formatPartner(partner as never);
      return this.ok(res, formattedPartner, "Partner retrieved successfully");
    } catch (error) {
      return next(error);
    }
  };

  getPartnerByUserId = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { userId } = req.params as Record<string, string>;
      const partner = await partnerService.getPartnerByUserId(userId);

      if (!partner) {
        return this.notFound(res, "Partner not found");
      }

      const formattedPartner = ResponseFormatter.formatPartner(partner as never);
      return this.ok(res, formattedPartner, "Partner retrieved successfully");
    } catch (error) {
      return next(error);
    }
  };

  getAllPartners = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const partners = await partnerService.getAllPartners();
      const formattedPartners = partners.map((partner) => ResponseFormatter.formatPartner(partner as never));
      return this.ok(res, formattedPartners, "Partners retrieved successfully");
    } catch (error) {
      return next(error);
    }
  };
}

export default new PartnerController();
