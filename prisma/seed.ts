/**
 * Seed MÍNIMO: solo lo necesario para operar (usuarios por rol y subfamilias del catálogo).
 * Los productos reales se cargan desde Inventario → Carga Excel o Catálogo → Nuevo producto.
 * Uso: npx prisma db seed   (idempotente: se puede correr varias veces)
 */
import { PrismaClient, Familia, Rol } from '@prisma/client';
import { hashSync } from 'bcrypt';

const prisma = new PrismaClient();

const SUBFAMILIAS: Record<Familia, string[]> = {
  VIDRIO: ['Crudo', 'Templado', 'Catedral', 'Espejo', 'Laminado', 'Reflejante'],
  PERFIL: ['Serie 20', 'Serie 25', 'Serie 42', 'Tubulares'],
  ACCESORIO: ['Garruchas', 'Cerraduras', 'Selladores', 'Felpas y tornillería'],
};

// Cuentas iniciales: el gerente cambia contraseñas y crea el resto desde el módulo Personal (S10).
const PASSWORD_DEV = 'galaxi123';
const USUARIOS = [
  { usuario: 'gerente', nombre: 'Gerente General', rol: Rol.GERENTE },
  { usuario: 'rosa', nombre: 'Rosa M.', rol: Rol.CAJERA },
  { usuario: 'carlos', nombre: 'Carlos G.', rol: Rol.VENDEDORA },
  { usuario: 'pedro', nombre: 'Pedro Q.', rol: Rol.CORTADOR },
  { usuario: 'maestro', nombre: 'Miguel T.', rol: Rol.MAESTRO },
];

async function main(): Promise<void> {
  // 1) Usuarios por rol
  const hash = hashSync(PASSWORD_DEV, 12);
  for (const u of USUARIOS) {
    await prisma.usuario.upsert({
      where: { usuario: u.usuario },
      create: { ...u, hashPassword: hash },
      update: { nombre: u.nombre, rol: u.rol },
    });
  }

  // 2) Subfamilias (taxonomía del catálogo; sin productos)
  for (const [familia, nombres] of Object.entries(SUBFAMILIAS) as [Familia, string[]][]) {
    for (const nombre of nombres) {
      await prisma.subfamilia.upsert({
        where: { familia_nombre: { familia, nombre } },
        create: { familia, nombre },
        update: {},
      });
    }
  }

  console.warn('Seed completado: 5 usuarios (password dev: galaxi123) y subfamilias. Sin datos demo.');
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
