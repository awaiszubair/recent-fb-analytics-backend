import { BaseRoute } from "../core/base.route";
import postController from "../controllers/post.controller";
import postInsightsController from "../controllers/post_insights.controller";

export class PostRoutes extends BaseRoute {
  protected registerRoutes(): void {
    this.router.get("/page/:pageId", postController.getPagePosts);
    this.router.get("/:postId/insights/:since/:until", postInsightsController.getPostInsights);
    this.router.get("/:postId/insights/:metricName/:since/:until", postInsightsController.getPostMetrics);
    this.router.get("/:postId/comments", postController.getPostComments);
    this.router.get("/:postId/comments-count", postController.getPostCommentsCount);
    this.router.get("/:postId/shares-count", postController.getPostSharesCount);
    this.router.get("/:postId", postController.getPostById);
    this.router.post("/", postController.createPost);
    this.router.post("/:postId/insights", postInsightsController.createPostInsight);
  }
}

export default new PostRoutes().getRouter();
