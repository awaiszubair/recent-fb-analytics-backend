import { BaseRoute } from "../core/base.route";
import revenueExportController from "../controllers/revenueExport.controller";

export class RevenueExportRoutes extends BaseRoute {
  protected registerRoutes(): void {
    this.router.get("/", revenueExportController.getRevenueExport);
  }
}

export default new RevenueExportRoutes().getRouter();
