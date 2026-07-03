-- CreateTable
CREATE TABLE "ResumenVentasDia" (
    "fecha" TEXT NOT NULL,
    "ventasCentimos" INTEGER NOT NULL DEFAULT 0,
    "tickets" INTEGER NOT NULL DEFAULT 0,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumenVentasDia_pkey" PRIMARY KEY ("fecha")
);
