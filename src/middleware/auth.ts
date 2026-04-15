import axios from "axios";
import type { NextFunction, Request, Response } from "express";
import { Environment } from "../config/environment";

export class FacebookTokenMiddleware {
  exchangeToken = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const body = req.body as { accessToken?: string; access_token?: string };
      const shortToken = body.accessToken || body.access_token;

      if (!shortToken) {
        return res.status(400).json({ error: "Access token required" });
      }

      const longTokenRes = await axios.get(`${Environment.facebookOauthBaseUrl}/oauth/access_token`, {
        params: {
          grant_type: "fb_exchange_token",
          client_id: Environment.fbAppId,
          client_secret: Environment.fbAppSecret,
          fb_exchange_token: shortToken,
        },
      });

      const longLivedToken = longTokenRes.data.access_token as string;

      const pagesRes = await axios.get(`${Environment.facebookOauthBaseUrl}/me/accounts`, {
        params: {
          access_token: longLivedToken,
        },
      });

      const authReq = req as Request & {
        facebookAuth?: { userLongToken?: string; pages?: unknown[] };
      };

      authReq.facebookAuth = {
        userLongToken: longLivedToken,
        pages: pagesRes.data.data,
      };

      return next();
    } catch (error) {
      console.error("FB Middleware Error:", axios.isAxiosError(error) ? error.response?.data || error.message : error);
      return res.status(500).json({ error: "Facebook token exchange failed" });
    }
  };
}

export default new FacebookTokenMiddleware().exchangeToken;
