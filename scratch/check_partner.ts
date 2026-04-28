import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    // Check partners table
    const partners = await prisma.partner.findMany({ take: 5 });
    console.log("Partners:", JSON.stringify(partners, null, 2));

    // Check connected pages for the partner
    if (partners.length > 0) {
      const partner = partners[0];
      const pages = await prisma.connectedPage.findMany({
        where: { partner_id: partner.id },
      });
      console.log(`Pages for partner ${partner.id}:`, JSON.stringify(pages.map(p => ({
        id: p.id,
        fb_page_id: p.fb_page_id,
        page_name: p.page_name,
        partner_id: p.partner_id,
      })), null, 2));
    }
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
