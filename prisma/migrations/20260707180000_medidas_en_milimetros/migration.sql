-- Cambio de unidad del sistema: cm → MILÍMETROS ENTEROS (regla del dueño).
-- Renombra las columnas *Cm → *Mm y convierte los datos existentes (×10, redondeando los Float).

-- Retazo: cm Int → mm Int
ALTER TABLE "Retazo" RENAME COLUMN "anchoCm" TO "anchoMm";
ALTER TABLE "Retazo" RENAME COLUMN "altoCm" TO "altoMm";
UPDATE "Retazo" SET "anchoMm" = "anchoMm" * 10, "altoMm" = "altoMm" * 10;

-- Medida (vanos de obra): cm Int → mm Int
ALTER TABLE "Medida" RENAME COLUMN "anchoCm" TO "anchoMm";
ALTER TABLE "Medida" RENAME COLUMN "altoCm" TO "altoMm";
UPDATE "Medida" SET "anchoMm" = "anchoMm" * 10, "altoMm" = "altoMm" * 10;

-- VentaItem (vidrio a medida del POS): cm Float → mm Int
ALTER TABLE "VentaItem"
  ALTER COLUMN "anchoCm" SET DATA TYPE INTEGER USING ROUND("anchoCm" * 10)::int,
  ALTER COLUMN "altoCm"  SET DATA TYPE INTEGER USING ROUND("altoCm" * 10)::int;
ALTER TABLE "VentaItem" RENAME COLUMN "anchoCm" TO "anchoMm";
ALTER TABLE "VentaItem" RENAME COLUMN "altoCm" TO "altoMm";

-- CorteVenta (cola de cortes del mostrador): cm Float → mm Int
ALTER TABLE "CorteVenta"
  ALTER COLUMN "anchoCm" SET DATA TYPE INTEGER USING ROUND("anchoCm" * 10)::int,
  ALTER COLUMN "altoCm"  SET DATA TYPE INTEGER USING ROUND("altoCm" * 10)::int;
ALTER TABLE "CorteVenta" RENAME COLUMN "anchoCm" TO "anchoMm";
ALTER TABLE "CorteVenta" RENAME COLUMN "altoCm" TO "altoMm";

-- CotizacionItem: cm Float → mm Int
ALTER TABLE "CotizacionItem"
  ALTER COLUMN "anchoCm" SET DATA TYPE INTEGER USING ROUND("anchoCm" * 10)::int,
  ALTER COLUMN "altoCm"  SET DATA TYPE INTEGER USING ROUND("altoCm" * 10)::int;
ALTER TABLE "CotizacionItem" RENAME COLUMN "anchoCm" TO "anchoMm";
ALTER TABLE "CotizacionItem" RENAME COLUMN "altoCm" TO "altoMm";
