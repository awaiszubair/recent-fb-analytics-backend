import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const pageId = "1036934312835044";
    const since = new Date("2026-03-20");
    const until = new Date("2026-04-30");
    
    const insights = await prisma.pageInsight.findMany({
      where: {
        page_id: pageId,
        end_time: {
          gte: since,
          lte: until
        }
      },
      take: 5
    });
    console.log(`Insights for ${pageId} between ${since.toISOString()} and ${until.toISOString()}:`, insights.length);
    console.log("Sample:", JSON.stringify(insights, null, 2));
    
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
