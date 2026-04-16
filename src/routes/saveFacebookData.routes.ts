import { BaseRoute } from "../core/base.route";
import saveFacebookDataController from "../controllers/saveFacebookData.controller";

export class SaveFacebookDataRoutes extends BaseRoute {
  protected registerRoutes(): void {
    this.router.post("/", saveFacebookDataController.initialConnectionSync);
    this.router.get("/diagnostics", saveFacebookDataController.diagnostics);
  }
}

export default new SaveFacebookDataRoutes().getRouter();
