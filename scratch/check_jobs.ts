import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const jobs = await prisma.syncJob.findMany({
      orderBy: { created_at: "desc" },
      take: 10
    });
    console.log("Recent Sync Jobs:", JSON.stringify(jobs, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
