import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const earnings = await prisma.pageInsight.findMany({
      where: {
        metric_name: {
          in: ["content_monetization_earnings", "monetization_approximate_earnings"]
        }
      }
    });
    console.log("Total Earnings Rows:", earnings.length);
    console.log("Sample Earnings:", JSON.stringify(earnings.slice(0, 5), null, 2));
    
    const postEarnings = await prisma.postInsight.findMany({
      where: {
        metric_name: {
          in: ["content_monetization_earnings", "monetization_approximate_earnings"]
        }
      }
    });
    console.log("Total Post Earnings Rows:", postEarnings.length);
    
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
