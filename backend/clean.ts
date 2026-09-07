import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando limpieza de la base de datos...');

  // Borrar tickets
  const { count: ticketsCount } = await prisma.ticket.deleteMany();
  console.log(`Borrados ${ticketsCount} tickets (soportes/estadísticas).`);

  // Borrar usuarios excepto administrador
  const { count: usersCount } = await prisma.user.deleteMany({
    where: {
      cedula: { not: 'administrador' }
    }
  });
  console.log(`Borrados ${usersCount} usuarios (dejando solo a administrador).`);

  console.log('¡Base de datos lista y limpia!');
}

main().finally(() => prisma.$disconnect());
