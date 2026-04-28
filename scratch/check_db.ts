import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const pages = await prisma.connectedPage.findMany();
    console.log("Pages in DB:", JSON.stringify(pages, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));

    const posts = await prisma.post.findMany({ take: 5 });
    console.log("Sample Posts in DB:", JSON.stringify(posts, null, 2));

    const insights = await prisma.pageInsight.findMany({ take: 5 });
    console.log("Sample Page Insights in DB:", JSON.stringify(insights, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
