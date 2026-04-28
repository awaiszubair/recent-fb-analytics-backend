import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Environment } from "./environment";

class DatabaseConnection {
  private prisma: PrismaClient | null = null;
  private schemaAligned = false;

  private createClient(): PrismaClient {
    const databaseUrl = Environment.databaseUrl;

    if (!databaseUrl) {
      throw new Error("Missing DATABASE_URL in environment");
    }

    return new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });
  }

  async connect(): Promise<PrismaClient> {
    if (!this.prisma) {
      this.prisma = this.createClient();
    }

    await this.prisma.$connect();
    await this.alignInsightIdColumns();
    console.log("Prisma PostgreSQL connected successfully");
    return this.prisma;
  }

  get client(): PrismaClient {
    if (!this.prisma) {
      this.prisma = this.createClient();
    }

    return this.prisma;
  }

  async disconnect(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
      this.prisma = null;
      this.schemaAligned = false;
    }
  }

  private async alignInsightIdColumns(): Promise<void> {
    if (!this.prisma || this.schemaAligned) {
      return;
    }

    const pageInsightColumn = (await this.prisma.$queryRawUnsafe(
      "SELECT data_type FROM information_schema.columns WHERE table_name = 'page_insights' AND column_name = 'page_id' LIMIT 1"
    )) as Array<{ data_type: string }>;

    if (pageInsightColumn[0]?.data_type === "uuid") {
      await this.prisma.$executeRawUnsafe("ALTER TABLE page_insights ALTER COLUMN page_id TYPE TEXT USING page_id::TEXT");
      await this.prisma.$executeRawUnsafe(
        "UPDATE page_insights pi SET page_id = cp.fb_page_id FROM connected_pages cp WHERE pi.page_id = cp.id::TEXT"
      );
    }

    const postInsightColumn = (await this.prisma.$queryRawUnsafe(
      "SELECT data_type FROM information_schema.columns WHERE table_name = 'post_insights' AND column_name = 'post_id' LIMIT 1"
    )) as Array<{ data_type: string }>;

    if (postInsightColumn[0]?.data_type === "uuid") {
      await this.prisma.$executeRawUnsafe("ALTER TABLE post_insights ALTER COLUMN post_id TYPE TEXT USING post_id::TEXT");
      await this.prisma.$executeRawUnsafe(
        "UPDATE post_insights poi SET post_id = p.fb_post_id FROM posts p WHERE poi.post_id = p.id::TEXT"
      );
    }

    this.schemaAligned = true;
  }
}

export const database = new DatabaseConnection();

export const connectDB = async (): Promise<PrismaClient> => database.connect();
export const getDB = (): PrismaClient => database.client;
export const disconnectDB = async (): Promise<void> => database.disconnect();
