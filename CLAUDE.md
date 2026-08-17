# CLAUDE.md — Guía para agentes de IA

Documentación para agentes (Claude Code y similares) que trabajen en este repo.
Para otras herramientas que leen `AGENTS.md`, se puede enlazar: `ln -s CLAUDE.md AGENTS.md`.

## Qué es

**Simplify IVA** — app web para que profesionales independientes en Costa Rica calculen
su declaración de IVA (formulario D-104). El usuario sube los XML de facturación
electrónica (v4.4 de Hacienda) de sus compras y ventas; la app extrae los montos,
los clasifica y calcula el IVA a pagar / crédito fiscal del período.

## Stack

- **Next.js 16** (App Router, Server Actions, RSC) + **React 19** + **TypeScript**
- **Prisma 7** + **PostgreSQL** (`@prisma/adapter-pg`)
- **NextAuth 4** (credenciales) — sesión centralizada en `getSession()` de `auth.ts`
- **Tailwind CSS v4**
- **fast-xml-parser** para parsear los XML
- **Mailgun** para ingesta de facturas por correo

## Comandos

```bash
pnpm dev            # desarrollo (next dev)
pnpm build          # prisma generate + migrate deploy + next build
pnpm lint           # eslint (nota: toolchain de eslint puede fallar; usar `npx tsc --noEmit`)
pnpm db:studio      # prisma studio
pnpm db:sync        # prisma migrate deploy
```

Chequeo de tipos rápido y confiable: `npx tsc --noEmit`.
La `url` de la datasource se inyecta vía `prisma.config.ts` (dotenv), no está en `schema.prisma`.

## Arquitectura / flujo de datos

Dos vías de ingreso, un mismo parser y persistencia:

1. **Upload manual** — `app/upload/page.tsx` → server action `processXMLFile` en `app/actions.ts`.
2. **Correo (Mailgun)** — webhook `app/api/email/inbound/route.ts` → `lib/email-processor.ts`.

Ambas rutas:
`parseInvoiceXML` (`lib/xml-parser.ts`) → clasificar GASTO/EMITIDA por Tax ID →
dedup por `(userId, clave)` → cifrar campos sensibles (`lib/crypto.ts`) → `prisma.invoice.create`.

Reportes: `getTaxSummary` / `getInvoicesByPeriod` en `app/actions.ts` agregan por período
y alimentan `app/page.tsx` y `app/reports/`.

### Archivos clave

- `lib/xml-parser.ts` — parseo del XML a `ParsedXMLInvoice`. **Corazón del dominio.**
- `lib/email-processor.ts` — ingesta por correo.
- `app/actions.ts` — server actions: upload, reportes, saldo a favor.
- `lib/crypto.ts` — cifrado de campos sensibles (montos y nombres → columnas `*Encrypted Json?`).
- `lib/utils.ts` — formateo (CRC/USD/fecha) y fechas de vencimiento del IVA.
- `lib/types.ts` — tipos compartidos.
- `prisma/schema.prisma` — modelos `User`, `Invoice`, `EmailLog`, `PasswordResetCode`.

## Reglas de dominio (IVA / Hacienda v4.4) — NO obvias, no romper

- **Documentos soportados:** `FacturaElectronica`, `NotaCreditoElectronica`, `NotaDebitoElectronica`.
  `TiqueteElectronico` se rechaza; `MensajeReceptor` se ignora.
- **signo:** `-1` para nota de crédito (resta al período); `+1` para factura y nota de débito.
- **Base imponible ≠ TotalGravado del resumen.** En el `ResumenFactura`, `TotalGravado` y
  `TotalExento` son **brutos, antes de descuentos**. La base imponible real (neta de descuento)
  está a nivel de línea en `BaseImponible`. Por eso el parser calcula gravado/exento **desde las
  líneas** (`parseLineItems`) y NO desde `TotalGravado`. Si se usara el resumen, en facturas con
  `Descuento` quedaría `base × tarifa ≠ IVA`.
- **Exonerado / no-sujeto** sí se toman del `ResumenFactura` (`TotalExonerado`,
  `TotalServNoSujeto` + `TotalMercNoSujeta`), porque a nivel de línea no se distinguen de forma
  fiable. Para evitar doble conteo, `parseLineItems` **salta** las líneas con `MontoExoneracion > 0`
  (no las suma a gravado ni a exento).
- **IVA del período:** se usa `TotalImpuesto` del resumen como impuesto neto autoritativo
  (ya descuenta exoneración). No recalcular el IVA desde la base.
- **Tarifa:** se lee el campo numérico `Tarifa` (ej. 13.00), no `CodigoTarifaIVA` (ej. `08`).
  La tarifa predominante es la de mayor base gravada.
- **Moneda:** solo `CRC` y `USD`. CRC ⇒ `tipoCambio = 1.0`. USD ⇒ requiere `TipoCambio` en el XML;
  los montos se guardan en su moneda y se convierten a CRC (`*CRC`) al mostrar.
- **Clasificación GASTO vs EMITIDA:** por Tax ID del usuario (normalizado, sin puntuación) contra
  emisor/receptor. Receptor = usuario ⇒ GASTO; Emisor = usuario ⇒ EMITIDA. En upload el Tax ID es
  obligatorio; si el XML no coincide, se rechaza.
- **Deduplicación:** por `(userId, clave)` (índice único en Prisma).
- **Vencimiento del IVA** (`lib/utils.ts:getIVADueDate`): día 15 del mes siguiente.
  Excepción: setiembre 2025 vence el 24 de octubre 2025.
- **Saldo a favor:** el crédito fiscal (compras > ventas) se acumula en `User.saldoAFavor` y se
  aplica en períodos siguientes (`getTaxSummary`, `actualizarSaldoAFavor`).

## Convenciones

- **Sin comentarios en el código.** El codebase se mantiene sin comentarios a propósito; el "porqué"
  del dominio vive en este archivo. No reintroducir comentarios explicativos; preferir nombres claros.
- **Campos sensibles cifrados:** montos y nombres de emisor/receptor se guardan cifrados en columnas
  `*Encrypted` (JSON). Nunca persistir esos valores en claro; usar los helpers de `lib/crypto.ts`.
- **UI en español** (CR). Términos de dominio (gravado, exento, exonerado, no sujeto, débito/crédito
  fiscal) se usan tal cual en identificadores y strings.
- **Privacidad:** este repo procesa datos tributarios reales. No exponer XML, claves ni montos en logs
  compartibles ni fuera del entorno.
