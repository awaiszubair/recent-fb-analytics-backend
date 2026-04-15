import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Environment } from "./environment";

class DatabaseConnection {
  private prisma: PrismaClient | null = null;

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
    console.log("Prisma PostgreSQL connected successfully");
    return this.prisma;
  }

  get client(): PrismaClient {
    if (!this.prisma) {
      throw new Error("Database not initialized. Call connectDB() first.");
    }

    return this.prisma;
  }

  async disconnect(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
      this.prisma = null;
    }
  }
}

export const database = new DatabaseConnection();

export const connectDB = async (): Promise<PrismaClient> => database.connect();
export const getDB = (): PrismaClient => database.client;
export const disconnectDB = async (): Promise<void> => database.disconnect();
