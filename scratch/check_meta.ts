import insightsService from "../src/services/insights.service";
import connectedPageRepository from "../src/repositories/ConnectedPage";
import { resolveStoredToken } from "../src/utils/insight-cache.helpers";

async function main() {
  const pageId = "1036934312835044";
  const metrics = ["page_impressions_unique", "page_post_engagements", "page_media_view"];
  
  try {
    const page = await connectedPageRepository.getPageByFbPageId(pageId);
    const token = await resolveStoredToken(page?.page_token_encrypted);
    
    if (!token) {
      console.error("No token found for page");
      return;
    }

    const result = await insightsService.getPageInsights(pageId, metrics, {
      access_token: token,
      since: "2026-04-01",
      until: "2026-04-27"
    });

    console.log("Meta API Result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error);
  }
}

main();
