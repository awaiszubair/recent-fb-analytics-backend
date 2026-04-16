import type { Request, Response } from "express";
import { BaseController } from "../core/base.controller";
import { facebookSyncQueue } from "../queues/facebookSync.queue";
import saveFacebookDataService from "../services/saveFacebookData.service";

export class SaveFacebookDataController extends BaseController {
  initialConnectionSync = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const body = req.body as { access_token?: string; accessToken?: string };
      const authReq = req as Request & { facebookAuth?: { userLongToken?: string } };
      const accessToken = body.access_token || body.accessToken || authReq.facebookAuth?.userLongToken;

      if (!accessToken) {
        return this.badRequest(res, "access_token is required");
      }

      const result = await saveFacebookDataService.initialConnectionSync(accessToken);
      return this.ok(res, result, "Initial connection sync complete");
    } catch (error) {
      return this.fail(res, error instanceof Error ? error.message : String(error), 500, error);
    }
  };

  diagnostics = async (_req: Request, res: Response): Promise<Response | void> => {
    try {
      const queue = await facebookSyncQueue.getDiagnostics();

      return this.ok(res, {
        apiProcess: true,
        nodeEnv: process.env.NODE_ENV || "development",
        queue,
      }, "Facebook sync diagnostics");
    } catch (error) {
      return this.fail(res, error instanceof Error ? error.message : String(error), 500, error);
    }
  };

}

export default new SaveFacebookDataController();
