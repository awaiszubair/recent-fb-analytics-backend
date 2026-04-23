import insightsService from "./insights.service";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Run this with: npx ts-node test-insights.ts
 */
async function test() {
    // Replace these with actual values for testing
    const testPostId = "1036934312835044_122105943447067849";
    const testToken = "EAAMZAxgBE7gIBRWUL80y0UnUmhZB85whtX0yUJZBxXsJEMx0OnyZABC0T0MDb7ZBP8WG5T5AWF33GVRVqJqmDIvOZBnsEZCtPA9juqKqEmLlpEZAKQj9rEhDrX2ed90HTm9an5ZCZClS8eHMgCrZCt6z8LpAnYyoZAtZBsq5lWlZCsiMlZCFZA0ZBjc1vr5Rl2xYItbZAuUZBDws390m2lZAB5c5FEALUHD0S256nRpJxmZANzZBXrjAZDZD";

    console.log("ðŸš€ Starting test for getPostWithInsights...");

    try {
        const result = await insightsService.getPostWithInsights(testPostId, {
            access_token: testToken,
            // since: "2024-01-01", // optional
            // until: "2024-04-18", // optional
        });

        console.log("âœ… Success!");
        console.log("Result Data:", JSON.stringify(result.data, null, 2));
    } catch (error) {
        console.error("âŒ Test Failed:");
        console.error(error.message);
    }
}

test();
