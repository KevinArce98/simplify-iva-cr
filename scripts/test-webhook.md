# Mailgun Webhook Test Payloads

## Test 1: Valid Email with XML Attachment

This simulates a valid email with one XML invoice attachment.

```bash
#!/bin/bash

# Set your local server URL
WEBHOOK_URL="http://localhost:3000/api/email/inbound"

# Generate test signature (you'll need to replace with actual values)
TIMESTAMP=$(date +%s)
TOKEN="test-token-$(date +%s)"

# Note: You need to compute the actual signature using your signing key
# For testing, you can temporarily disable signature validation or use the test script

curl -X POST "$WEBHOOK_URL" \
  -F "timestamp=$TIMESTAMP" \
  -F "token=$TOKEN" \
  -F "signature=COMPUTE_THIS_WITH_TEST_SCRIPT" \
  -F "recipient=user@yourdomain.com" \
  -F "sender=supplier@example.com" \
  -F "subject=Invoice #12345" \
  -F "Message-Id=<20260207123456.1.ABCD@mailgun.org>" \
  -F "from=Supplier Inc <supplier@example.com>" \
  -F "attachment-count=1" \
  -F "attachment-1=@test-invoice.xml;type=application/xml"
```

## Test 2: Email with Multiple Attachments (XML + PDF)

```bash
curl -X POST "$WEBHOOK_URL" \
  -F "timestamp=$TIMESTAMP" \
  -F "token=$TOKEN" \
  -F "signature=COMPUTE_THIS_WITH_TEST_SCRIPT" \
  -F "recipient=user@yourdomain.com" \
  -F "sender=supplier@example.com" \
  -F "subject=Multiple Documents" \
  -F "Message-Id=<20260207123457.1.ABCD@mailgun.org>" \
  -F "attachment-count=2" \
  -F "attachment-1=@invoice-001.xml;type=application/xml" \
  -F "attachment-2=@receipt.pdf;type=application/pdf"
```

## Test 3: Invalid Signature (Should Fail)

```bash
curl -X POST "$WEBHOOK_URL" \
  -F "timestamp=$TIMESTAMP" \
  -F "token=$TOKEN" \
  -F "signature=invalid-signature-12345" \
  -F "recipient=user@yourdomain.com" \
  -F "sender=supplier@example.com" \
  -F "subject=Test"

# Expected response: 401 Unauthorized
```

## Test 4: Old Timestamp (Should Fail - Replay Protection)

```bash
OLD_TIMESTAMP=$(($(date +%s) - 3600))  # 1 hour ago

curl -X POST "$WEBHOOK_URL" \
  -F "timestamp=$OLD_TIMESTAMP" \
  -F "token=$TOKEN" \
  -F "signature=COMPUTE_WITH_OLD_TIMESTAMP" \
  -F "recipient=user@yourdomain.com" \
  -F "sender=supplier@example.com" \
  -F "subject=Test"

# Expected response: 401 Unauthorized - "Request timestamp too old"
```

## Sample Test Invoice XML

Save this as `test-invoice.xml` for testing:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<FacturaElectronica xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica">
  <Clave>50601012024010112345678901234567890123456789012</Clave>
  <NumeroConsecutivo>00100001010000000001</NumeroConsecutivo>
  <FechaEmision>2024-01-01T10:00:00-06:00</FechaEmision>
  
  <Emisor>
    <Nombre>Test Supplier S.A.</Nombre>
    <Identificacion>
      <Tipo>02</Tipo>
      <Numero>3101234567</Numero>
    </Identificacion>
  </Emisor>
  
  <Receptor>
    <Nombre>Test Customer Inc</Nombre>
    <Identificacion>
      <Tipo>02</Tipo>
      <Numero>3109876543</Numero>
    </Identificacion>
  </Receptor>
  
  <DetalleServicio>
    <LineaDetalle>
      <NumeroLinea>1</NumeroLinea>
      <Cantidad>1</Cantidad>
      <UnidadMedida>Unid</UnidadMedida>
      <Detalle>Test Service</Detalle>
      <PrecioUnitario>10000.00</PrecioUnitario>
      <MontoTotal>10000.00</MontoTotal>
      <SubTotal>10000.00</SubTotal>
      <BaseImponible>10000.00</BaseImponible>
      <Impuesto>
        <Codigo>01</Codigo>
        <CodigoTarifa>08</CodigoTarifa>
        <Tarifa>13</Tarifa>
        <Monto>1300.00</Monto>
      </Impuesto>
      <ImpuestoNeto>1300.00</ImpuestoNeto>
      <MontoTotalLinea>11300.00</MontoTotalLinea>
    </LineaDetalle>
  </DetalleServicio>
  
  <ResumenFactura>
    <CodigoTipoMoneda>
      <CodigoMoneda>CRC</CodigoMoneda>
      <TipoCambio>1.00</TipoCambio>
    </CodigoTipoMoneda>
    <TotalGravado>10000.00</TotalGravado>
    <TotalExento>0.00</TotalExento>
    <TotalVenta>10000.00</TotalVenta>
    <TotalDescuentos>0.00</TotalDescuentos>
    <TotalVentaNeta>10000.00</TotalVentaNeta>
    <TotalImpuesto>1300.00</TotalImpuesto>
    <TotalComprobante>11300.00</TotalComprobante>
  </ResumenFactura>
</FacturaElectronica>
```

## Testing with Mailgun's Test Mode

1. Log into Mailgun Dashboard
2. Go to **Sending** → **Webhooks**
3. Click **Test webhook**
4. Select event type: **Incoming Messages**
5. Configure:
   - URL: Your webhook URL
   - Method: POST
6. Send test

## Expected Responses

### Successful Processing

```json
{
  "success": true,
  "message": "Email processed successfully",
  "recipient": "user@yourdomain.com",
  "userId": "clxxxxxxxxxxxxx",
  "attachments": {
    "total": 1,
    "processed": 1,
    "skipped": 0,
    "failed": 0
  },
  "processingTimeMs": 1247
}
```

### User Not Found

```json
{
  "success": false,
  "recipient": "unknown@yourdomain.com",
  "totalAttachments": 1,
  "processedAttachments": 0,
  "skippedAttachments": 0,
  "failedAttachments": 0,
  "results": [],
  "error": "No user found with email: unknown@yourdomain.com"
}
```

### Invalid Signature

```json
{
  "error": "Invalid signature",
  "details": "Request timestamp too old (replay attack prevention)"
}
```

## Debugging Tips

### Enable Verbose Logging

Check your application logs for detailed processing information:

```
📧 Received email from supplier@example.com to user@yourdomain.com
   Subject: Invoice #12345
   Attachments: 1
   📎 invoice-001.xml (application/xml, 2456 bytes)
✓ Email processed in 1247ms
   Processed: 1
   Skipped: 0
   Failed: 0
   ✓ invoice-001.xml → Invoice clxxxxxxxxxxxxx
```

### Check Database

```sql
-- Check latest email logs
SELECT * FROM "EmailLog" ORDER BY "createdAt" DESC LIMIT 10;

-- Check created invoices
SELECT * FROM "Invoice" ORDER BY "createdAt" DESC LIMIT 10;
```

### Mailgun Logs

Check Mailgun dashboard for delivery confirmation:
1. Go to **Sending** → **Logs**
2. Filter by your recipient email
3. Check webhook delivery status
