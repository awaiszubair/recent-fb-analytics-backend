import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const pageId = "1036934312835044";
    const posts = await prisma.post.findMany({
      where: { page_id: pageId },
      orderBy: { created_time: "desc" },
      take: 10
    });
    console.log(`Posts for page ${pageId}:`, posts.length);
    posts.forEach(p => console.log(`${p.fb_post_id} | ${p.created_time}`));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
