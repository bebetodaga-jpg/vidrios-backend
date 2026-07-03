-- CreateEnum
CREATE TYPE "EstadoObra" AS ENUM ('MEDICION', 'REMETREO', 'CORTE', 'FABRICACION', 'INSTALACION', 'ENTREGADA');

-- CreateEnum
CREATE TYPE "EstadoContrato" AS ENUM ('VIGENTE', 'ANULADO');

-- AlterTable
ALTER TABLE "Obra" ADD COLUMN     "estado" "EstadoObra" NOT NULL DEFAULT 'MEDICION';

-- CreateTable
CREATE TABLE "Contrato" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "clienteId" TEXT,
    "obraId" TEXT,
    "totalCentimos" INTEGER NOT NULL,
    "adelantoCentimos" INTEGER NOT NULL,
    "saldoCentimos" INTEGER NOT NULL,
    "pagadoCentimos" INTEGER NOT NULL DEFAULT 0,
    "firmaDataUrl" TEXT,
    "estado" "EstadoContrato" NOT NULL DEFAULT 'VIGENTE',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contrato_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contrato_numero_key" ON "Contrato"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Contrato_cotizacionId_key" ON "Contrato"("cotizacionId");

-- CreateIndex
CREATE INDEX "Contrato_estado_creadoEn_idx" ON "Contrato"("estado", "creadoEn");

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
