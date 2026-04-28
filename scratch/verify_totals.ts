import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const pageId = "1036934312835044";
    const insights = await prisma.pageInsight.findMany({
      where: { 
          page_id: pageId,
          metric_name: "page_media_view"
      }
    });
    const total = insights.reduce((sum, i) => sum + (Number(i.metric_value) || 0), 0);
    console.log(`Total page_media_view for ${pageId}:`, total);
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
