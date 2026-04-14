const axios = require("axios");

const exchangeFacebookToken = async (req, res, next) => {
  try {
    const shortToken = req.body.accessToken;

    if (!shortToken) {
      return res.status(400).json({ error: "Access token required" });
    }

    // STEP 1: Convert to long-lived token
    const longTokenRes = await axios.get(
      `https://graph.facebook.com/v19.0/oauth/access_token`,
      {
        params: {
          grant_type: "fb_exchange_token",
          client_id: process.env.FB_APP_ID,
          client_secret: process.env.FB_APP_SECRET,
          fb_exchange_token: shortToken,
        },
      }
    );

    const longLivedToken = longTokenRes.data.access_token;

    // STEP 2: Get user's pages + page tokens
    const pagesRes = await axios.get(
      `https://graph.facebook.com/v19.0/me/accounts`,
      {
        params: {
          access_token: longLivedToken,
        },
      }
    );

    // Attach to request for next controller
    req.fbData = {
      userLongToken: longLivedToken,
      pages: pagesRes.data.data, // contains page tokens
    };

    next();
  } catch (error) {
    console.error("FB Middleware Error:", error.response?.data || error.message);
    return res.status(500).json({ error: "Facebook token exchange failed" });
  }
};

module.exports = exchangeFacebookToken;