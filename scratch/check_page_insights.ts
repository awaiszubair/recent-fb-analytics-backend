import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const pageId = "1036934312835044";
    const insights = await prisma.pageInsight.findMany({
      where: { page_id: pageId },
      take: 10
    });
    console.log(`Insights for page ${pageId}:`, insights.length);
    if (insights.length > 0) {
        console.log("Sample insight:", JSON.stringify(insights[0], null, 2));
    }
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
