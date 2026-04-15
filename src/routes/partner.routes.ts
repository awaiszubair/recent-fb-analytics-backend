import { BaseRoute } from "../core/base.route";
import partnerController from "../controllers/partner.controller";

export class PartnerRoutes extends BaseRoute {
  protected registerRoutes(): void {
    this.router.get("/user/:userId", partnerController.getPartnerByUserId);
    this.router.get("/", partnerController.getAllPartners);
    this.router.get("/:partnerId", partnerController.getPartnerById);
    this.router.post("/", partnerController.createPartner);
  }
}

export default new PartnerRoutes().getRouter();
