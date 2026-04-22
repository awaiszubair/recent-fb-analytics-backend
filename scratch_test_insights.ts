import insightsService from "./src/services/insights.service";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * MANUAL TEST SCRIPT
 * Run this with: npx ts-node scratch_test_insights.ts
 * 
 * Instructions:
 * 1. Replace YOUR_ACCESS_TOKEN and YOUR_POST_ID with real values.
 * 2. Run the command above.
 */

async function testGetPostWithInsights() {
    const accessToken = "YOUR_ACCESS_TOKEN"; // Pass a valid user/page access token
    const postId = "YOUR_POST_ID";         // Pass a valid post ID

    console.log("--- Starting Test: getPostWithInsights ---");
    
    try {
        const result = await insightsService.getPostWithInsights(postId, {
            access_token: accessToken,
            // since: "2024-01-01", // Optional
            // until: "2024-04-18"  // Optional
        });

        console.log("✅ Success!");
        console.log("Data details:", JSON.stringify(result.data, null, 2));

    } catch (error) {
        console.error("❌ Test Failed!");
        console.error(error);
    }
}

testGetPostWithInsights();
