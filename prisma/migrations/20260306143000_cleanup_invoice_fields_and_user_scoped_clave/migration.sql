-- Make invoice duplicate validation user-scoped (userId + clave)
-- and remove unused Invoice columns

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Invoice_clave_key'
  ) THEN
    ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_clave_key";
  END IF;
END $$;

ALTER TABLE "Invoice"
  DROP COLUMN IF EXISTS "totalServGravados",
  DROP COLUMN IF EXISTS "totalServExentos",
  DROP COLUMN IF EXISTS "totalServExonerado",
  DROP COLUMN IF EXISTS "totalMercanciasGravadas",
  DROP COLUMN IF EXISTS "totalMercanciasExentas",
  DROP COLUMN IF EXISTS "totalMercanciasExonerada",
  DROP COLUMN IF EXISTS "totalGravado",
  DROP COLUMN IF EXISTS "totalExento",
  DROP COLUMN IF EXISTS "totalExonerado",
  DROP COLUMN IF EXISTS "totalVenta",
  DROP COLUMN IF EXISTS "totalDescuentos",
  DROP COLUMN IF EXISTS "totalVentaNeta",
  DROP COLUMN IF EXISTS "totalIVADevuelto",
  DROP COLUMN IF EXISTS "totalOtrosCargos";

CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_userId_clave_key"
  ON "Invoice"("userId", "clave");
