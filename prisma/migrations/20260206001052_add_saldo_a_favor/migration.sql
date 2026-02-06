-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "saldoAFavor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "numeroConsecutivo" TEXT,
    "clave" TEXT,
    "fechaEmision" TIMESTAMP(3),
    "emisorNombre" TEXT,
    "emisorIdentificacion" TEXT,
    "receptorNombre" TEXT,
    "receptorIdentificacion" TEXT,
    "subtotalGravado" DOUBLE PRECISION DEFAULT 0,
    "subtotalExento" DOUBLE PRECISION DEFAULT 0,
    "tarifaIVA" DOUBLE PRECISION DEFAULT 13,
    "totalServGravados" DOUBLE PRECISION DEFAULT 0,
    "totalServExentos" DOUBLE PRECISION DEFAULT 0,
    "totalServExonerado" DOUBLE PRECISION DEFAULT 0,
    "totalMercanciasGravadas" DOUBLE PRECISION DEFAULT 0,
    "totalMercanciasExentas" DOUBLE PRECISION DEFAULT 0,
    "totalMercanciasExonerada" DOUBLE PRECISION DEFAULT 0,
    "totalGravado" DOUBLE PRECISION DEFAULT 0,
    "totalExento" DOUBLE PRECISION DEFAULT 0,
    "totalExonerado" DOUBLE PRECISION DEFAULT 0,
    "totalVenta" DOUBLE PRECISION DEFAULT 0,
    "totalDescuentos" DOUBLE PRECISION DEFAULT 0,
    "totalVentaNeta" DOUBLE PRECISION DEFAULT 0,
    "totalImpuesto" DOUBLE PRECISION DEFAULT 0,
    "totalIVADevuelto" DOUBLE PRECISION DEFAULT 0,
    "totalOtrosCargos" DOUBLE PRECISION DEFAULT 0,
    "totalComprobante" DOUBLE PRECISION DEFAULT 0,
    "tipoMoneda" TEXT,
    "tipoCambio" DOUBLE PRECISION DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_clave_key" ON "Invoice"("clave");

-- CreateIndex
CREATE INDEX "Invoice_userId_idx" ON "Invoice"("userId");

-- CreateIndex
CREATE INDEX "Invoice_tipo_idx" ON "Invoice"("tipo");

-- CreateIndex
CREATE INDEX "Invoice_fechaEmision_idx" ON "Invoice"("fechaEmision");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
