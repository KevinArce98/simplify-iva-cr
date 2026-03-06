# Simplify IVA CR

Production-ready web application for calculating monthly IVA (VAT) for independent professionals in Costa Rica.

## Features

- **XML Upload**: Batch upload of Costa Rican electronic invoice XMLs (FacturaElectronica v4.4)
- **Two Upload Types**:
  - Gastos (Expenses) - IVA Crédito
  - Facturas Emitidas (Issued Invoices) - IVA Débito
- **Automatic Processing**:
  - Server-side XML parsing
  - Exchange rate extraction from XML
  - USD to CRC conversion
  - IVA calculations
- **Reports Dashboard**:
  - Monthly tax summary
  - Detailed transaction table
  - Export capabilities
- **Drag & Drop**: Modern file upload with drag-and-drop support

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **XML Parsing**: fast-xml-parser
- **Runtime**: Node.js

## Project Structure

```
/app
  /actions.ts           # Server actions for invoice processing
  /page.tsx             # Dashboard homepage
  /layout.tsx           # Root layout with fonts
  /globals.css          # Global styles and design tokens
  /upload/
    /page.tsx           # XML upload page with drag & drop
  /reports/
    /page.tsx           # Results and reports page
/lib
  /types.ts             # TypeScript type definitions
  /xml-parser.ts        # XML parsing utilities
  /store.ts             # In-memory invoice store
  /utils.ts             # Formatting utilities
```

## Getting Started

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Run development server**:
   ```bash
   pnpm dev
   ```

3. **Open browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### 1. Upload XML Files

- Go to "Carga de XML" page
- Drag and drop XML files or click to browse
- Choose upload zone:
  - **Gastos**: For expense invoices (IVA Crédito)
  - **Emitidas**: For issued invoices (IVA Débito)

### 2. View Results

- Files are processed automatically
- Navigate to "Declaraciones" to see:
  - IVA Débito (sales/collected VAT)
  - IVA Crédito (expenses/paid VAT)
  - IVA a Pagar (total to pay)
  - Detailed transaction table

### 3. Sample Files

Two sample XML files are included:
- `sample_factura_emitida.xml` - Issued invoice in USD
- `sample_factura_gasto.xml` - Expense invoice in CRC

## Data Model

### Invoice Type
```typescript
type Invoice = {
  id: string;
  tipo: 'GASTO' | 'EMITIDA';
  fecha: string;
  moneda: 'CRC' | 'USD';
  ivaOriginal: number;
  totalOriginal: number;
  tipoCambio: number;
  ivaCRC: number;
  totalCRC: number;
}
```

## Tax Calculation Logic

1. **Parse XML**: Extract invoice data (date, currency, IVA amount, exchange rate)
2. **Convert to CRC**: Multiply IVA by exchange rate from XML
3. **Calculate**:
   - IVA Débito = Sum of IVA from EMITIDA invoices
   - IVA Crédito = Sum of IVA from GASTO invoices
   - IVA a Pagar = IVA Débito - IVA Crédito

## Important Notes

### Exchange Rates

The application uses the **exchange rate included in each XML invoice** (field `ResumenFactura.TipoCambio`). This ensures accuracy as it uses the same rate that was applied when the invoice was issued.

### Data Storage

Currently uses **in-memory storage**. Data is lost on server restart. For production:

1. Integrate a database (PostgreSQL, MySQL, etc.)
2. Update the store in `lib/store.ts`
3. Implement proper data persistence

### Supported XML Types

- **FacturaElectronica** (v4.4) - Standard electronic invoice
- **MensajeReceptor** - Ignored for calculations

### Security Considerations

For production deployment:

1. Add authentication
2. Implement file size limits
3. Add virus scanning for uploads
4. Use HTTPS
5. Implement rate limiting

## Design System

### Colors
- Primary: `#2563eb` (Blue)
- Background Light: `#f8f9fc`
- Surface Light: `#ffffff`
- Text Main: `#0e121b`
- Text Secondary: `#4d6599`
- Border: `#d0d7e7`

### Typography
- Font Family: Inter
- Icons: Material Symbols Outlined

## Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## License

This project is for demonstration purposes.

## Support

For questions or issues, please contact the development team.

