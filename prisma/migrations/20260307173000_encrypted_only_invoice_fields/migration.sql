-- Encrypted-only invoice model: remove legacy plaintext sensitive columns.

ALTER TABLE "Invoice"
  DROP COLUMN IF EXISTS "numeroConsecutivo",
  DROP COLUMN IF EXISTS "emisorNombre",
  DROP COLUMN IF EXISTS "emisorIdentificacion",
  DROP COLUMN IF EXISTS "receptorNombre",
  DROP COLUMN IF EXISTS "receptorIdentificacion",
  DROP COLUMN IF EXISTS "subtotalGravado",
  DROP COLUMN IF EXISTS "subtotalExento",
  DROP COLUMN IF EXISTS "totalImpuesto",
  DROP COLUMN IF EXISTS "totalComprobante";
