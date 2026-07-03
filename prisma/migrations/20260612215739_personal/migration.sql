-- CreateEnum
CREATE TYPE "TipoPagoPersonal" AS ENUM ('ADELANTO', 'PAGO', 'DESTAJO');

-- CreateTable
CREATE TABLE "PersonalExterno" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "telefono" TEXT,
    "especialidad" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonalExterno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cuadrilla" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,

    CONSTRAINT "Cuadrilla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuadrillaAsignacion" (
    "id" TEXT NOT NULL,
    "cuadrillaId" TEXT NOT NULL,
    "personalId" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "asignadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CuadrillaAsignacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagoPersonal" (
    "id" TEXT NOT NULL,
    "personalId" TEXT NOT NULL,
    "obraId" TEXT,
    "tipo" "TipoPagoPersonal" NOT NULL,
    "concepto" TEXT NOT NULL,
    "montoCentimos" INTEGER NOT NULL,
    "registradoPorId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PagoPersonal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PersonalExterno_dni_key" ON "PersonalExterno"("dni");

-- CreateIndex
CREATE INDEX "Cuadrilla_obraId_idx" ON "Cuadrilla"("obraId");

-- CreateIndex
CREATE UNIQUE INDEX "CuadrillaAsignacion_cuadrillaId_personalId_key" ON "CuadrillaAsignacion"("cuadrillaId", "personalId");

-- CreateIndex
CREATE INDEX "PagoPersonal_personalId_creadoEn_idx" ON "PagoPersonal"("personalId", "creadoEn");

-- CreateIndex
CREATE INDEX "PagoPersonal_obraId_idx" ON "PagoPersonal"("obraId");

-- AddForeignKey
ALTER TABLE "Cuadrilla" ADD CONSTRAINT "Cuadrilla_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuadrillaAsignacion" ADD CONSTRAINT "CuadrillaAsignacion_cuadrillaId_fkey" FOREIGN KEY ("cuadrillaId") REFERENCES "Cuadrilla"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuadrillaAsignacion" ADD CONSTRAINT "CuadrillaAsignacion_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "PersonalExterno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoPersonal" ADD CONSTRAINT "PagoPersonal_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "PersonalExterno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
