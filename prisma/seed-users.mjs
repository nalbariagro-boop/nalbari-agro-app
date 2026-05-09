import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL is required to seed users.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const users = [
  {
    username: "admin",
    email: "admin@nalbariagro.local",
    password: "admin123",
    role: "ADMIN",
  },
  {
    username: "staff",
    email: "staff@nalbariagro.local",
    password: "staff123",
    role: "STAFF",
  },
  {
    username: "staff2",
    email: "staff2@nalbariagro.local",
    password: "staff123",
    role: "STAFF",
  },
];

for (const user of users) {
  const passwordHash = await bcrypt.hash(user.password, 12);

  await prisma.user.upsert({
    where: {
      username: user.username,
    },
    update: {
      email: user.email,
      passwordHash,
      role: user.role,
    },
    create: {
      username: user.username,
      email: user.email,
      passwordHash,
      role: user.role,
    },
  });

  console.log(`Seeded ${user.role.toLowerCase()} user: ${user.username}`);
}

await prisma.$disconnect();
