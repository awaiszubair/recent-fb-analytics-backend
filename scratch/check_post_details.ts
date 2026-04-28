import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const postId = "1036934312835044_122105938047067849";
  const post = await prisma.post.findFirst({
    where: { fb_post_id: postId },
  });

  console.log("Post details in DB:");
  console.log(JSON.stringify(post, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
