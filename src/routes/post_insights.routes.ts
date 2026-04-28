import { BaseRoute } from "../core/base.route";
import postInsightsController from "../controllers/post_insights.controller";

export class PostInsightsRoutes extends BaseRoute {
  protected registerRoutes(): void {
    this.router.post("/batch/:since/:until", postInsightsController.getMultiplePostInsights);
    this.router.post("/batch", postInsightsController.getMultiplePostInsights);
    this.router.get("/:postId/:since/:until", postInsightsController.getPostInsights);
    this.router.get("/:postId/metrics/:metricName/:since/:until", postInsightsController.getPostMetrics);
    this.router.get("/:postId/metrics/:metricName", postInsightsController.getPostMetrics);
    this.router.get("/:postId", postInsightsController.getPostInsights);
    this.router.post("/:postId", postInsightsController.createPostInsight);
  }
}

export default new PostInsightsRoutes().getRouter();
