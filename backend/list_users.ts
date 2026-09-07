import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('Usuarios actuales:');
  users.forEach(u => console.log(`- ${u.cedula} (${u.role})`));
}

main().finally(() => prisma.$disconnect());
