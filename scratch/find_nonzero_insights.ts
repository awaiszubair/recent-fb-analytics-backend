import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const pageId = "1036934312835044";
    const insights = await prisma.pageInsight.findMany({
      where: { 
          page_id: pageId,
          metric_value: { gt: 0 }
      },
      orderBy: { end_time: "desc" },
      take: 20
    });
    console.log(`Non-zero insights for page ${pageId}:`, insights.length);
    insights.forEach(i => {
        console.log(`${i.metric_name} | ${i.metric_value} | ${i.end_time}`);
    });
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
