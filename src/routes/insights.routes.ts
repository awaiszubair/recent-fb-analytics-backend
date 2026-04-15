import { BaseRoute } from "../core/base.route";
import insightsController from "../controllers/insights.controller";

export class InsightsRoutes extends BaseRoute {
  protected registerRoutes(): void {
    this.router.get("/health", insightsController.healthCheck);
    this.router.get("/metrics", insightsController.getAvailableMetrics);
    this.router.post("/user", insightsController.getUserDetails);
    this.router.post("/pages/batch/:since/:until", insightsController.getMultiplePageInsights);
    this.router.post("/pages/:pageId/:since/:until", insightsController.getPageInsights);
    this.router.post("/posts/batch/:since/:until", insightsController.getMultiplePostInsights);
    this.router.post("/posts/:postId/:since/:until", insightsController.getPostInsights);
    this.router.post("/posts/:postId/comments-count", insightsController.getPostCommentsCount);
    this.router.post("/posts/:postId/shares-count", insightsController.getPostSharesCount);
  }
}

export default new InsightsRoutes().getRouter();
