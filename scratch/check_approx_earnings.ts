import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const pageId = "1036934312835044";
    const insights = await prisma.pageInsight.findMany({
      where: { 
          page_id: pageId,
          metric_name: "monetization_approximate_earnings",
          metric_value: { not: null }
      },
      take: 10
    });
    console.log(`Approx earnings insights found:`, insights.length);
    if (insights.length > 0) {
        console.log("Sample:", JSON.stringify(insights[0], null, 2));
    }
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
