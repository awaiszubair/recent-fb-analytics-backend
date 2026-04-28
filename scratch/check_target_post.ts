import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const post = await prisma.post.findUnique({
      where: { id: "2db998e9-07fa-46f0-8484-82cb846d6b08" }
    });
    console.log("Target Post:", JSON.stringify(post, null, 2));

    if (post) {
      const insights = await prisma.postInsight.findMany({
        where: { post_id: post.fb_post_id }
      });
      console.log("Post Insights in DB:", JSON.stringify(insights, null, 2));
    }
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
