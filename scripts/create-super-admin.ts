import "dotenv/config"; // loads .env / .env.local before anything else runs
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const passwordHash = await bcrypt.hash("123456", 10);

  const admin = await prisma.superAdmin.upsert({
    where: { email: "admin@gmail.com" },
    update: { passwordHash },
    create: {
      name: "System Owner",
      email: "admin@gmail.com",
      passwordHash,
    },
  });

  console.log("Super admin ready:", admin.id, admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });