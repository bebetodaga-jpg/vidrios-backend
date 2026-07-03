-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'TARJETA', 'YAPE_PLIN', 'CREDITO');

-- CreateEnum
CREATE TYPE "EstadoVenta" AS ENUM ('CONFIRMADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "TipoMovimientoCaja" AS ENUM ('VENTA', 'INGRESO', 'EGRESO', 'COBRO_CREDITO');

-- CreateTable
CREATE TABLE "StockResumen" (
    "productoId" TEXT NOT NULL,
    "saldo" INTEGER NOT NULL,

    CONSTRAINT "StockResumen_pkey" PRIMARY KEY ("productoId")
);

-- CreateTable
CREATE TABLE "Numeracion" (
    "serie" TEXT NOT NULL,
    "correlativo" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Numeracion_pkey" PRIMARY KEY ("serie")
);

-- CreateTable
CREATE TABLE "Venta" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "estado" "EstadoVenta" NOT NULL DEFAULT 'CONFIRMADA',
    "metodoPago" "MetodoPago" NOT NULL,
    "descuentoPct" INTEGER NOT NULL DEFAULT 0,
    "subtotalCentimos" INTEGER NOT NULL,
    "totalCentimos" INTEGER NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "clienteId" TEXT,
    "cajaSesionId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentaItem" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "codigoProducto" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "unidadVenta" "UnidadVenta" NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "anchoCm" INTEGER,
    "altoCm" INTEGER,
    "precioCentimos" INTEGER NOT NULL,
    "importeCentimos" INTEGER NOT NULL,

    CONSTRAINT "VentaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outbox" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "procesadoEn" TIMESTAMP(3),

    CONSTRAINT "Outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CajaSesion" (
    "id" TEXT NOT NULL,
    "abiertaPorId" TEXT NOT NULL,
    "montoInicialCentimos" INTEGER NOT NULL,
    "abiertaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerradaEn" TIMESTAMP(3),
    "declEfectivoCentimos" INTEGER,
    "declTarjetaCentimos" INTEGER,
    "declYapeCentimos" INTEGER,

    CONSTRAINT "CajaSesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoCaja" (
    "id" TEXT NOT NULL,
    "cajaSesionId" TEXT NOT NULL,
    "tipo" "TipoMovimientoCaja" NOT NULL,
    "metodo" "MetodoPago" NOT NULL,
    "concepto" TEXT NOT NULL,
    "montoCentimos" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoCaja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuentaPorCobrar" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "saldoCentimos" INTEGER NOT NULL,
    "venceEn" TIMESTAMP(3) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CuentaPorCobrar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Venta_numero_key" ON "Venta"("numero");

-- CreateIndex
CREATE INDEX "Venta_creadoEn_idx" ON "Venta"("creadoEn");

-- CreateIndex
CREATE INDEX "Outbox_procesadoEn_creadoEn_idx" ON "Outbox"("procesadoEn", "creadoEn");

-- CreateIndex
CREATE INDEX "MovimientoCaja_cajaSesionId_idx" ON "MovimientoCaja"("cajaSesionId");

-- CreateIndex
CREATE UNIQUE INDEX "CuentaPorCobrar_ventaId_key" ON "CuentaPorCobrar"("ventaId");

-- CreateIndex
CREATE INDEX "CuentaPorCobrar_venceEn_idx" ON "CuentaPorCobrar"("venceEn");

-- AddForeignKey
ALTER TABLE "StockResumen" ADD CONSTRAINT "StockResumen_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_cajaSesionId_fkey" FOREIGN KEY ("cajaSesionId") REFERENCES "CajaSesion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaItem" ADD CONSTRAINT "VentaItem_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CajaSesion" ADD CONSTRAINT "CajaSesion_abiertaPorId_fkey" FOREIGN KEY ("abiertaPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_cajaSesionId_fkey" FOREIGN KEY ("cajaSesionId") REFERENCES "CajaSesion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuentaPorCobrar" ADD CONSTRAINT "CuentaPorCobrar_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuentaPorCobrar" ADD CONSTRAINT "CuentaPorCobrar_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
