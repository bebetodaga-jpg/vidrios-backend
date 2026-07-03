-- CreateEnum
CREATE TYPE "EstadoOrdenCorte" AS ENUM ('PENDIENTE', 'LISTA', 'ERROR');

-- CreateEnum
CREATE TYPE "EstadoOrdenCompra" AS ENUM ('PENDIENTE', 'RECIBIDA');

-- CreateTable
CREATE TABLE "OrdenCorte" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "estado" "EstadoOrdenCorte" NOT NULL DEFAULT 'PENDIENTE',
    "resultado" JSONB,
    "error" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrdenCorte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdenCompra" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "estado" "EstadoOrdenCompra" NOT NULL DEFAULT 'PENDIENTE',
    "items" JSONB NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recibidaEn" TIMESTAMP(3),

    CONSTRAINT "OrdenCompra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrdenCorte_numero_key" ON "OrdenCorte"("numero");

-- CreateIndex
CREATE INDEX "OrdenCorte_estado_creadoEn_idx" ON "OrdenCorte"("estado", "creadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "OrdenCompra_numero_key" ON "OrdenCompra"("numero");

-- CreateIndex
CREATE INDEX "OrdenCompra_estado_creadoEn_idx" ON "OrdenCompra"("estado", "creadoEn");

-- AddForeignKey
ALTER TABLE "OrdenCorte" ADD CONSTRAINT "OrdenCorte_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
