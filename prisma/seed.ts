import "dotenv/config";
import { PrismaClient } from "../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });


async function main() {
  const email = "admin@gmail.com";
  const plainPassword = "admin123"; // change immediately after first login

  const existing = await prisma.superAdmin.findUnique({ where: { email } });
  if (existing) {
    console.log("Super admin already exists:", email);
    return;
  }

  const passwordHash = await bcrypt.hash(plainPassword, 10);

  const superAdmin = await prisma.superAdmin.create({
    data: {
      name: "System Owner",
      email,
      passwordHash,
      preferredLanguage: "en",
    },
  });

  console.log("Super admin created:");
  console.log("  email:", email);
  console.log("  password:", plainPassword, "(change this immediately)");
  console.log("  id:", superAdmin.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });