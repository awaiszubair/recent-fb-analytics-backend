import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const earnings = await prisma.earnings.findMany({
      take: 10
    });
    console.log(`Earnings found:`, earnings.length);
    if (earnings.length > 0) {
        console.log("Sample earnings:", JSON.stringify(earnings[0], null, 2));
    }
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
