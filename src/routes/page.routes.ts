import { BaseRoute } from "../core/base.route";
import pageController from "../controllers/page.controller";
import pageInsightsController from "../controllers/page_insights.controller";

export class PageRoutes extends BaseRoute {
  protected registerRoutes(): void {
    this.router.get("/partner/:partnerId", pageController.getPartnerPages);
    this.router.get("/:pageId/insights/:since/:until", pageInsightsController.getPageInsights);
    this.router.get("/:pageId/insights/:metricName/:since/:until", pageInsightsController.getPageMetrics);
    this.router.get("/:pageId", pageController.getPageById);
    this.router.post("/", pageController.createPage);
    this.router.post("/:pageId/insights", pageInsightsController.createPageInsight);
  }
}

export default new PageRoutes().getRouter();
