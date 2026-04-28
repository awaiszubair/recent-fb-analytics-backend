import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const post = await prisma.post.findFirst();
    console.log("First post:", JSON.stringify(post, null, 2));

    // Check what page_id value is stored
    const posts = await prisma.post.findMany({ take: 3 });
    posts.forEach(p => {
      console.log(`fb_post_id: ${p.fb_post_id} | page_id stored: ${p.page_id}`);
    });

    // Check connected page UUID vs fb_page_id
    const page = await prisma.connectedPage.findFirst({ where: { fb_page_id: "1036934312835044" } });
    console.log("Connected page UUID:", page?.id);
    console.log("Connected page fb_page_id:", page?.fb_page_id);
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
