import { BaseRoute } from "../core/base.route";
import pageInsightsController from "../controllers/page_insights.controller";

export class PageInsightsRoutes extends BaseRoute {
  protected registerRoutes(): void {
    this.router.post("/batch/:since/:until", pageInsightsController.getMultiplePageInsights);
    this.router.post("/batch", pageInsightsController.getMultiplePageInsights);
    this.router.get("/:fbPageId/:since/:until", pageInsightsController.getPageInsights);
    this.router.get("/:fbPageId/export-report/:since/:until", pageInsightsController.exportPageReport);
    this.router.get("/:fbPageId/metrics/:metricName/:since/:until", pageInsightsController.getPageMetrics);
    this.router.get("/:fbPageId/metrics/:metricName", pageInsightsController.getPageMetrics);
    this.router.get("/:fbPageId", pageInsightsController.getPageInsights);
    this.router.post("/:fbPageId", pageInsightsController.createPageInsight);
  }
}

export default new PageInsightsRoutes().getRouter();
