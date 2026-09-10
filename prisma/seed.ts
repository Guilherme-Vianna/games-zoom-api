import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { randomBytes } from "node:crypto";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = await bcrypt.hash("gameszoom123", 10);

  const demo = await prisma.user.upsert({
    where: { email: "demo@games-zoom.local" },
    update: { emailVerified: new Date() },
    create: {
      name: "Demo",
      email: "demo@games-zoom.local",
      password,
      emailVerified: new Date(),
    },
  });

  await prisma.wishlist.upsert({
    where: { id: "demo-wishlist" },
    update: {},
    create: {
      id: "demo-wishlist",
      name: "Jogos pra jogar com a galera",
      ownerId: demo.id,
      invites: {
        create: { token: randomBytes(24).toString("base64url"), createdById: demo.id },
      },
    },
  });

  console.log("Seed ok. Login: demo@games-zoom.local / gameszoom123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
