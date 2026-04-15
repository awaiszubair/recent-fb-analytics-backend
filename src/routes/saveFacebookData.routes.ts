import { BaseRoute } from "../core/base.route";
import saveFacebookDataController from "../controllers/saveFacebookData.controller";

export class SaveFacebookDataRoutes extends BaseRoute {
  protected registerRoutes(): void {
    this.router.post("/", saveFacebookDataController.initialConnectionSync);
    this.router.post("/partner", saveFacebookDataController.syncPartner);
    this.router.post("/page", saveFacebookDataController.syncPage);
    this.router.post("/post", saveFacebookDataController.syncPost);
    this.router.post("/page-insights", saveFacebookDataController.syncPageInsights);
    this.router.post("/post-insights", saveFacebookDataController.syncPostInsights);
    this.router.post("/earnings/page", saveFacebookDataController.syncPageEarnings);
    this.router.post("/earnings/post", saveFacebookDataController.syncPostEarnings);
    this.router.post("/sync-job", saveFacebookDataController.createSyncJob);
    this.router.patch("/sync-job/:jobId", saveFacebookDataController.updateSyncJob);
    this.router.post("/third-party", saveFacebookDataController.saveThirdPartyData);
  }
}

export default new SaveFacebookDataRoutes().getRouter();
