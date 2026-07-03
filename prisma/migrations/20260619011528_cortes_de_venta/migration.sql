-- CreateEnum
CREATE TYPE "EstadoCorteVenta" AS ENUM ('PENDIENTE', 'CORTADO');

-- CreateTable
CREATE TABLE "CorteVenta" (
    "id" TEXT NOT NULL,
    "ventaNumero" TEXT NOT NULL,
    "productoCodigo" TEXT NOT NULL,
    "productoNombre" TEXT NOT NULL,
    "anchoCm" DOUBLE PRECISION NOT NULL,
    "altoCm" DOUBLE PRECISION NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "estado" "EstadoCorteVenta" NOT NULL DEFAULT 'PENDIENTE',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorteVenta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CorteVenta_estado_creadoEn_idx" ON "CorteVenta"("estado", "creadoEn");

-- CreateIndex
CREATE INDEX "CorteVenta_ventaNumero_idx" ON "CorteVenta"("ventaNumero");
