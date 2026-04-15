const { prismaClientClass } = require('./prismaClient');

let prisma = null;

const createPrismaClient = () => {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!databaseUrl) {
    throw new Error('Missing DATABASE_URL in environment');
  }

  return new prismaClientClass({
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });
};

const connectDB = async () => {
  try {
    if (!prisma) {
      prisma = createPrismaClient();
    }

    await prisma.$connect();
    console.log('Prisma PostgreSQL connected successfully');
  } catch (error) {
    console.error('Prisma PostgreSQL connection failed:', error.message);
    process.exit(1);
  }
};

const getDB = () => {
  if (!prisma) {
    throw new Error('Database not initialized. Call connectDB() first.');
  }

  return prisma;
};

const disconnectDB = async () => {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
};

module.exports = { connectDB, getDB, disconnectDB };
