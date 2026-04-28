import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const earnings = await prisma.cmEarningsPage.findMany({
      where: { 
          OR: [
              { earnings_amount: { gt: 0 } },
              { approximate_earnings: { gt: 0 } }
          ]
      },
      take: 10
    });
    console.log(`Non-zero earnings found:`, earnings.length);
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
