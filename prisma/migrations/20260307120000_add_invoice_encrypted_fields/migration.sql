-- Add encrypted payload columns for sensitive invoice fields.
-- Each encrypted column stores a JSON object:
-- { ciphertext, iv, authTag, keyVersion, alg }

ALTER TABLE "Invoice"
  ADD COLUMN "numeroConsecutivoEncrypted" JSONB,
  ADD COLUMN "emisorNombreEncrypted" JSONB,
  ADD COLUMN "emisorIdentificacionEncrypted" JSONB,
  ADD COLUMN "receptorNombreEncrypted" JSONB,
  ADD COLUMN "receptorIdentificacionEncrypted" JSONB,
  ADD COLUMN "subtotalGravadoEncrypted" JSONB,
  ADD COLUMN "subtotalExentoEncrypted" JSONB,
  ADD COLUMN "totalImpuestoEncrypted" JSONB,
  ADD COLUMN "totalComprobanteEncrypted" JSONB;
