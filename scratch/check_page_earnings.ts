import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const pageId = "1036934312835044";
  const earnings = await prisma.cmEarningsPage.findMany({
    where: { page_id: pageId },
    orderBy: { end_time: "desc" },
    take: 5,
  });

  console.log("Latest Page Earnings in DB:");
  console.log(JSON.stringify(earnings, (key, value) => 
    typeof value === 'bigint' ? value.toString() : value, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
