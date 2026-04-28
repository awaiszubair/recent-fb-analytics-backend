import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const insights = await prisma.pageInsight.findMany({
      where: { 
          metric_name: { contains: "earning" }
      },
      take: 10
    });
    console.log(`Earning insights found:`, insights.length);
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
