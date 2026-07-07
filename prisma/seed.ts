/**
 * Seed de DESARROLLO (Sprint 0 — Backend): datos reales del negocio para que toda demo
 * arranque con catálogo, usuarios por rol, retazos y una obra medida.
 * Uso: npx prisma db seed   (idempotente: se puede correr varias veces)
 */
import { PrismaClient, Familia, UnidadVenta, Rol, TipoMedida, TipoMovimiento } from '@prisma/client';
import { hashSync } from 'bcrypt';

const prisma = new PrismaClient();

const SUBFAMILIAS: Record<Familia, string[]> = {
  VIDRIO: ['Crudo', 'Templado', 'Catedral', 'Espejo', 'Laminado', 'Reflejante'],
  PERFIL: ['Serie 20', 'Serie 25', 'Serie 42', 'Tubulares'],
  ACCESORIO: ['Garruchas', 'Cerraduras', 'Selladores', 'Felpas y tornillería'],
};

// Regla del dueño: crudo/catedral/espejo por PIE², templado por M². Precios inc. IGV en céntimos.
const PRODUCTOS = [
  { codigo: '7750001', nombre: 'Vidrio crudo incoloro 6 mm', familia: Familia.VIDRIO, subfamilia: 'Crudo', unidadVenta: UnidadVenta.PIE2, precioCentimos: 450, stockMinimo: 5, grosorMm: 6, stockInicial: 12, costoCentimos: 380 },
  { codigo: '7750003', nombre: 'Vidrio templado incoloro 8 mm', familia: Familia.VIDRIO, subfamilia: 'Templado', unidadVenta: UnidadVenta.M2, precioCentimos: 12_000, stockMinimo: 3, grosorMm: 8, stockInicial: 5, costoCentimos: 9_500 },
  { codigo: '7750004', nombre: 'Vidrio templado 10 mm', familia: Familia.VIDRIO, subfamilia: 'Templado', unidadVenta: UnidadVenta.M2, precioCentimos: 15_500, stockMinimo: 3, grosorMm: 10, stockInicial: 2, costoCentimos: 12_400 },
  { codigo: '7750005', nombre: 'Catedral bronce 4 mm', familia: Familia.VIDRIO, subfamilia: 'Catedral', unidadVenta: UnidadVenta.PIE2, precioCentimos: 350, stockMinimo: 4, grosorMm: 4, stockInicial: 9, costoCentimos: 280 },
  { codigo: '7750006', nombre: 'Espejo incoloro 4 mm', familia: Familia.VIDRIO, subfamilia: 'Espejo', unidadVenta: UnidadVenta.PIE2, precioCentimos: 500, stockMinimo: 3, grosorMm: 4, stockInicial: 7, costoCentimos: 400 },
  { codigo: '7751001', nombre: 'Perfil riel superior Serie 25 natural', familia: Familia.PERFIL, subfamilia: 'Serie 25', unidadVenta: UnidadVenta.BARRILLA_600, precioCentimos: 3_200, stockMinimo: 10, stockInicial: 24, costoCentimos: 2_600 },
  { codigo: '7751003', nombre: 'Perfil jamba Serie 25 bronce', familia: Familia.PERFIL, subfamilia: 'Serie 25', unidadVenta: UnidadVenta.BARRILLA_640, precioCentimos: 3_450, stockMinimo: 8, stockInicial: 4, costoCentimos: 2_800 },
  { codigo: '7752001', nombre: 'Garrucha simple nylon', familia: Familia.ACCESORIO, subfamilia: 'Garruchas', unidadVenta: UnidadVenta.UNIDAD, precioCentimos: 350, stockMinimo: 40, stockInicial: 150, costoCentimos: 200 },
  { codigo: '7752003', nombre: 'Silicona neutra transparente 300 ml', familia: Familia.ACCESORIO, subfamilia: 'Selladores', unidadVenta: UnidadVenta.UNIDAD, precioCentimos: 1_650, stockMinimo: 6, stockInicial: 0, costoCentimos: 1_300 },
];

const RETAZOS = [
  { codigo: 'R-08', producto: '7750001', anchoMm: 1200, altoMm: 800, origen: 'Obra OB-0041' },
  { codigo: 'R-11', producto: '7750001', anchoMm: 900, altoMm: 600, origen: 'Venta NV-000231' },
  { codigo: 'R-14', producto: '7750004', anchoMm: 1400, altoMm: 450, origen: 'Obra OB-0045' },
  { codigo: 'R-09', producto: '7750005', anchoMm: 1000, altoMm: 700, origen: 'Venta NV-000219' },
  { codigo: 'R-10', producto: '7750005', anchoMm: 750, altoMm: 550, origen: 'Venta NV-000224' },
];

// Solo desarrollo: en producción las cuentas se crean desde el módulo personal (S10).
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

  // 2) Subfamilias
  for (const [familia, nombres] of Object.entries(SUBFAMILIAS) as [Familia, string[]][]) {
    for (const nombre of nombres) {
      await prisma.subfamilia.upsert({
        where: { familia_nombre: { familia, nombre } },
        create: { familia, nombre },
        update: {},
      });
    }
  }

  // 3) Productos + kárdex de inventario inicial
  for (const p of PRODUCTOS) {
    const subfamilia = await prisma.subfamilia.findUniqueOrThrow({
      where: { familia_nombre: { familia: p.familia, nombre: p.subfamilia } },
    });
    const producto = await prisma.producto.upsert({
      where: { codigo: p.codigo },
      create: {
        codigo: p.codigo,
        nombre: p.nombre,
        subfamiliaId: subfamilia.id,
        unidadVenta: p.unidadVenta,
        precioCentimos: p.precioCentimos,
        stockMinimo: p.stockMinimo,
        grosorMm: p.grosorMm ?? null,
      },
      update: { precioCentimos: p.precioCentimos, stockMinimo: p.stockMinimo },
    });

    const tieneInventarioInicial = await prisma.movimientoKardex.findFirst({
      where: { productoId: producto.id, referencia: 'Inventario inicial' },
    });
    if (!tieneInventarioInicial && p.stockInicial > 0) {
      await prisma.movimientoKardex.create({
        data: {
          productoId: producto.id,
          tipo: TipoMovimiento.AJUSTE,
          cantidad: p.stockInicial,
          costoCentimos: p.costoCentimos,
          referencia: 'Inventario inicial',
        },
      });
    }
  }

  // 4) Retazos disponibles (insumo del optimizador, S8)
  for (const r of RETAZOS) {
    const producto = await prisma.producto.findUniqueOrThrow({ where: { codigo: r.producto } });
    await prisma.retazo.upsert({
      where: { codigo: r.codigo },
      create: { codigo: r.codigo, productoId: producto.id, anchoMm: r.anchoMm, altoMm: r.altoMm, origen: r.origen },
      update: {},
    });
  }

  // 5) Obra de ejemplo con medidas versionadas (la de los prototipos UX)
  const yaExisteObra = await prisma.obra.findUnique({ where: { codigo: 'OB-0048' } });
  if (!yaExisteObra) {
    const gerente = await prisma.usuario.findUniqueOrThrow({ where: { usuario: 'gerente' } });
    const maestro = await prisma.usuario.findUniqueOrThrow({ where: { usuario: 'maestro' } });
    const cliente = await prisma.cliente.create({
      data: { tipoDoc: 'DNI', numeroDoc: '09111222', nombre: 'Juan Torres', telefono: '999888777' },
    });
    const obra = await prisma.obra.create({
      data: { codigo: 'OB-0048', clienteId: cliente.id, direccion: 'Casa Familia Torres — Surco' },
    });
    const sala = await prisma.ambiente.create({ data: { obraId: obra.id, nombre: 'Sala' } });
    const dorm = await prisma.ambiente.create({ data: { obraId: obra.id, nombre: 'Dormitorio 1' } });

    const v01 = await prisma.vano.create({
      data: { ambienteId: sala.id, codigo: 'V-01', nombre: 'Ventana frontal', tipo: 'Ventana corrediza (serie)' },
    });
    const v02 = await prisma.vano.create({
      data: { ambienteId: sala.id, codigo: 'V-02', nombre: 'Mampara terraza', tipo: 'Mampara (serie)', tieneDetalle: true },
    });
    const v03 = await prisma.vano.create({
      data: { ambienteId: dorm.id, codigo: 'V-03', nombre: 'Ventana lateral', tipo: 'Ventana corrediza (serie)', cantidad: 2 },
    });

    await prisma.medida.createMany({
      data: [
        { vanoId: v01.id, tipo: TipoMedida.INICIAL, anchoMm: 1500, altoMm: 1200, autorId: gerente.id },
        { vanoId: v02.id, tipo: TipoMedida.INICIAL, anchoMm: 2410, altoMm: 2110, autorId: gerente.id },
        // Remetreo: nueva fila, nunca sobrescribe; autor MAESTRO (regla del dueño)
        { vanoId: v02.id, tipo: TipoMedida.REMETREO, anchoMm: 2400, altoMm: 2100, autorId: maestro.id },
        { vanoId: v03.id, tipo: TipoMedida.INICIAL, anchoMm: 1200, altoMm: 1000, autorId: gerente.id },
      ],
    });
  }

  console.warn('Seed completado: 5 usuarios (password dev: galaxi123), catálogo, retazos y obra OB-0048.');
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
