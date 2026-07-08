/**
 * Limpia los datos DEMO que sembraba el seed antiguo: los 9 productos de ejemplo
 * (con su kárdex, stock y retazos), los retazos de muestra y la obra OB-0048.
 * NO toca usuarios, subfamilias ni nada creado por el negocio.
 * Uso: npx ts-node prisma/limpiar-demo.ts   (respeta DATABASE_URL)
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CODIGOS_PRODUCTO_DEMO = [
  '7750001', '7750003', '7750004', '7750005', '7750006',
  '7751001', '7751003', '7752001', '7752003',
];
const CODIGOS_RETAZO_DEMO = ['R-08', 'R-09', 'R-10', 'R-11', 'R-14'];

async function main(): Promise<void> {
  // 1) Retazos de muestra (ninguna tabla los referencia)
  const retazos = await prisma.retazo.deleteMany({ where: { codigo: { in: CODIGOS_RETAZO_DEMO } } });
  console.warn(`Retazos demo eliminados: ${String(retazos.count)}`);

  // 2) Productos demo: primero sus dependencias (stock, kárdex, retazos restantes), luego el producto.
  //    Las ventas/cotizaciones guardan copia del producto, así que su historial no se rompe.
  for (const codigo of CODIGOS_PRODUCTO_DEMO) {
    const p = await prisma.producto.findUnique({ where: { codigo }, select: { id: true, nombre: true } });
    if (!p) {
      console.warn(`  ${codigo}: no existe (ya limpio)`);
      continue;
    }
    try {
      await prisma.$transaction([
        prisma.stockResumen.deleteMany({ where: { productoId: p.id } }),
        prisma.movimientoKardex.deleteMany({ where: { productoId: p.id } }),
        prisma.retazo.deleteMany({ where: { productoId: p.id } }),
        prisma.producto.delete({ where: { id: p.id } }),
      ]);
      console.warn(`  ${codigo} "${p.nombre}": eliminado`);
    } catch {
      // Si algo aún lo referencia, se desactiva: desaparece del POS y del catálogo.
      await prisma.producto.update({ where: { id: p.id }, data: { activo: false } });
      console.warn(`  ${codigo} "${p.nombre}": referenciado — quedó DESACTIVADO`);
    }
  }

  // 3) Obra demo OB-0048 (medidas → vanos → ambientes → obra) y su cliente de ejemplo.
  const obra = await prisma.obra.findUnique({ where: { codigo: 'OB-0048' }, include: { ambientes: { include: { vanos: true } } } });
  if (obra) {
    const vanoIds = obra.ambientes.flatMap((a) => a.vanos.map((v) => v.id));
    await prisma.$transaction([
      prisma.medida.deleteMany({ where: { vanoId: { in: vanoIds } } }),
      prisma.vano.deleteMany({ where: { id: { in: vanoIds } } }),
      prisma.ambiente.deleteMany({ where: { obraId: obra.id } }),
      prisma.obra.delete({ where: { id: obra.id } }),
    ]);
    console.warn('Obra demo OB-0048: eliminada');
    try {
      await prisma.cliente.deleteMany({ where: { numeroDoc: '09111222', nombre: 'Juan Torres' } });
      console.warn('Cliente demo Juan Torres: eliminado');
    } catch {
      console.warn('Cliente demo Juan Torres: referenciado por otros documentos — se conserva');
    }
  } else {
    console.warn('Obra demo OB-0048: no existe (ya limpia)');
  }

  const quedan = await prisma.producto.count();
  console.warn(`Limpieza terminada. Productos restantes en el catálogo: ${String(quedan)}`);
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
