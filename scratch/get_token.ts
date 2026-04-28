import { PrismaClient } from "@prisma/client";
import { decryptPageToken } from "../src/utils/pageTokenCrypto";

async function main() {
  const prisma = new PrismaClient();
  try {
    const page = await prisma.connectedPage.findFirst({
      where: { fb_page_id: "1036934312835044" }
    });
    if (page && page.page_token_encrypted) {
      console.log("Encrypted:", page.page_token_encrypted);
      const token = decryptPageToken(page.page_token_encrypted);
      console.log("Decrypted Token:", token);
    } else {
      console.log("Page or token not found");
    }
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
