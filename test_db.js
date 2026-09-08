const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findMany().then(r => console.log(JSON.stringify(r))).catch(e => console.error(e)).finally(() => prisma.$disconnect());
