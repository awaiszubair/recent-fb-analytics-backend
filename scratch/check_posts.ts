import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const postsCount = await prisma.post.count();
    console.log("Total posts in DB:", postsCount);
    
    const posts = await prisma.post.findMany({
      take: 5
    });
    console.log("Sample posts:", JSON.stringify(posts, null, 2));
    
    const targetPagePosts = await prisma.post.count({
      where: { page_id: "1036934312835044" }
    });
    console.log("Posts for page 1036934312835044:", targetPagePosts);
    
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
