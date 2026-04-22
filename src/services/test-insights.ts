import insightsService from "./insights.service";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Run this with: npx ts-node test-insights.ts
 */
async function test() {
    // Replace these with actual values for testing
    const testPostId = "1036934312835044_122105943447067849";
    const testToken = "EAAMZAxgBE7gIBRPv4UUXhjKoZAeG9H8wNG0jjZC1a50DFTCtU0DA0vAE0Q007rQDn9hUM6y2XUqZCZCYnbcnLnMqsxqFMUBh2mZBVH6hukHiEvXPakzbrHJ0KzxodZC2DHIsqaEAZB0e0MA34sv0gTm16ZBLsfnJXZCi1cMBuo9pUHj6byyBE2nRpAJ9B1GMUMsdlKmFhdRzG791VZAFIKxMqNq5XCxUnkHD50tZATZCooJ4ZAgfCT";

    console.log("🚀 Starting test for getPostWithInsights...");

    try {
        const result = await insightsService.getPostWithInsights(testPostId, {
            access_token: testToken,
            // since: "2024-01-01", // optional
            // until: "2024-04-18", // optional
        });

        console.log("✅ Success!");
        console.log("Result Data:", JSON.stringify(result.data, null, 2));
    } catch (error) {
        console.error("❌ Test Failed:");
        console.error(error.message);
    }
}

test();
