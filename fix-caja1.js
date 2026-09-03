const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst({
        where: { name: 'caja1' }
    });

    if (user && user.password === '123456') {
        const hashedPassword = await bcrypt.hash('123456', 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });
        console.log('Usuario caja1 corregido exitosamente.');
    } else {
        console.log('No se encontró al usuario caja1 o su contraseña ya no es 123456.');
    }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
