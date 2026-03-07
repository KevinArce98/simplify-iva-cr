# Cifrado de facturas en BD (enforced encrypted-only)

Este proyecto ahora guarda datos sensibles de facturas **solo cifrados** con AES-256-GCM a nivel aplicación.

## Campos sensibles cifrados

- `numeroConsecutivoEncrypted`
- `emisorNombreEncrypted`
- `emisorIdentificacionEncrypted`
- `receptorNombreEncrypted`
- `receptorIdentificacionEncrypted`
- `subtotalGravadoEncrypted`
- `subtotalExentoEncrypted`
- `totalImpuestoEncrypted`
- `totalComprobanteEncrypted`

No se usan columnas en claro para esos campos.

## Variables de entorno

### Recomendado

- `ENCRYPTION_MASTER_KEYS_JSON` con llaves versionadas.
- `MASTER_KEY_VERSION` con la versión activa de escritura.

Ejemplo:

```json
{"v1":"base64:W7H2M3kq7R7dX7M4v8H8v3x3e4Yl2Xw5oM1yJ8fL0qQ="}
```

Y en entorno:

```bash
MASTER_KEY_VERSION=v1
```

### Alternativa mínima

- `MASTER_KEY_V1`, `MASTER_KEY_V2`, ...
- `MASTER_KEY_VERSION`

## Inicialización

1. Configura `DATABASE_URL`.
2. Configura llaves (`ENCRYPTION_MASTER_KEYS_JSON` + `MASTER_KEY_VERSION`).
3. Ejecuta migraciones:

```bash
pnpm db:sync
```

Con esto el esquema queda en modo encrypted-only.
