-- CreateEnum
CREATE TYPE "TipoComprobante" AS ENUM ('BOLETA', 'FACTURA', 'NOTA_CREDITO');

-- CreateEnum
CREATE TYPE "EstadoComprobante" AS ENUM ('PENDIENTE', 'ACEPTADO', 'RECHAZADO', 'ANULADO');

-- CreateTable
CREATE TABLE "Comprobante" (
    "id" TEXT NOT NULL,
    "tipo" "TipoComprobante" NOT NULL,
    "serie" TEXT NOT NULL,
    "correlativo" INTEGER NOT NULL,
    "numero" TEXT NOT NULL,
    "estado" "EstadoComprobante" NOT NULL DEFAULT 'PENDIENTE',
    "ventaId" TEXT,
    "clienteTipoDoc" "TipoDocumento" NOT NULL,
    "clienteNumeroDoc" TEXT,
    "clienteNombre" TEXT NOT NULL,
    "gravadaCentimos" INTEGER NOT NULL,
    "igvCentimos" INTEGER NOT NULL,
    "totalCentimos" INTEGER NOT NULL,
    "cdrHash" TEXT,
    "enlacePdf" TEXT,
    "motivoRechazo" TEXT,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "comprobanteRefId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comprobante_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Comprobante_numero_key" ON "Comprobante"("numero");

-- CreateIndex
CREATE INDEX "Comprobante_estado_creadoEn_idx" ON "Comprobante"("estado", "creadoEn");

-- AddForeignKey
ALTER TABLE "Comprobante" ADD CONSTRAINT "Comprobante_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comprobante" ADD CONSTRAINT "Comprobante_comprobanteRefId_fkey" FOREIGN KEY ("comprobanteRefId") REFERENCES "Comprobante"("id") ON DELETE SET NULL ON UPDATE CASCADE;
