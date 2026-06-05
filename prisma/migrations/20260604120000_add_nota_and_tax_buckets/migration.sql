-- Support notas de crédito/débito and the full Hacienda tax-category breakdown.
-- All additions are prod-safe: existing rows keep their values and default to a
-- FacturaElectronica with signo = 1 (the only document type accepted previously).

ALTER TABLE "Invoice"
  ADD COLUMN "documentType" TEXT NOT NULL DEFAULT 'FacturaElectronica',
  ADD COLUMN "signo" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "subtotalExoneradoEncrypted" JSONB,
  ADD COLUMN "subtotalNoSujetoEncrypted" JSONB;
