-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('CAJERA', 'VENDEDORA', 'CORTADOR', 'AYUDANTE', 'MAESTRO', 'GERENTE');

-- CreateEnum
CREATE TYPE "Familia" AS ENUM ('VIDRIO', 'PERFIL', 'ACCESORIO');

-- CreateEnum
CREATE TYPE "UnidadVenta" AS ENUM ('PIE2', 'M2', 'BARRILLA_600', 'BARRILLA_640', 'UNIDAD');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE');

-- CreateEnum
CREATE TYPE "EstadoRetazo" AS ENUM ('DISPONIBLE', 'RESERVADO', 'CONSUMIDO');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('DNI', 'RUC', 'SIN_DOCUMENTO');

-- CreateEnum
CREATE TYPE "TipoMedida" AS ENUM ('INICIAL', 'REMETREO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "hashPassword" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subfamilia" (
    "id" TEXT NOT NULL,
    "familia" "Familia" NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Subfamilia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "subfamiliaId" TEXT NOT NULL,
    "unidadVenta" "UnidadVenta" NOT NULL,
    "precioCentimos" INTEGER NOT NULL,
    "stockMinimo" INTEGER NOT NULL DEFAULT 0,
    "grosorMm" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoKardex" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "costoCentimos" INTEGER NOT NULL,
    "referencia" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoKardex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Retazo" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "anchoCm" INTEGER NOT NULL,
    "altoCm" INTEGER NOT NULL,
    "origen" TEXT NOT NULL,
    "estado" "EstadoRetazo" NOT NULL DEFAULT 'DISPONIBLE',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Retazo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "tipoDoc" "TipoDocumento" NOT NULL DEFAULT 'SIN_DOCUMENTO',
    "numeroDoc" TEXT,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Obra" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Obra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ambiente" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Ambiente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vano" (
    "id" TEXT NOT NULL,
    "ambienteId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "tieneDetalle" BOOLEAN NOT NULL DEFAULT false,
    "fotoUrl" TEXT,

    CONSTRAINT "Vano_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medida" (
    "id" TEXT NOT NULL,
    "vanoId" TEXT NOT NULL,
    "tipo" "TipoMedida" NOT NULL,
    "anchoCm" INTEGER NOT NULL,
    "altoCm" INTEGER NOT NULL,
    "autorId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Medida_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_usuario_key" ON "Usuario"("usuario");

-- CreateIndex
CREATE UNIQUE INDEX "Subfamilia_familia_nombre_key" ON "Subfamilia"("familia", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_codigo_key" ON "Producto"("codigo");

-- CreateIndex
CREATE INDEX "Producto_nombre_idx" ON "Producto"("nombre");

-- CreateIndex
CREATE INDEX "MovimientoKardex_productoId_creadoEn_idx" ON "MovimientoKardex"("productoId", "creadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "Retazo_codigo_key" ON "Retazo"("codigo");

-- CreateIndex
CREATE INDEX "Retazo_productoId_estado_idx" ON "Retazo"("productoId", "estado");

-- CreateIndex
CREATE INDEX "Cliente_numeroDoc_idx" ON "Cliente"("numeroDoc");

-- CreateIndex
CREATE UNIQUE INDEX "Obra_codigo_key" ON "Obra"("codigo");

-- CreateIndex
CREATE INDEX "Medida_vanoId_creadoEn_idx" ON "Medida"("vanoId", "creadoEn");

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_subfamiliaId_fkey" FOREIGN KEY ("subfamiliaId") REFERENCES "Subfamilia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoKardex" ADD CONSTRAINT "MovimientoKardex_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retazo" ADD CONSTRAINT "Retazo_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Obra" ADD CONSTRAINT "Obra_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ambiente" ADD CONSTRAINT "Ambiente_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vano" ADD CONSTRAINT "Vano_ambienteId_fkey" FOREIGN KEY ("ambienteId") REFERENCES "Ambiente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medida" ADD CONSTRAINT "Medida_vanoId_fkey" FOREIGN KEY ("vanoId") REFERENCES "Vano"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medida" ADD CONSTRAINT "Medida_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
