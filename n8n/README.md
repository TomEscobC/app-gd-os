# Flujo n8n — APP-GD-OS

Este directorio contiene el flujo de orquestación de WhatsApp para la generación,
aprobación y rechazo automático de cotizaciones, ejecutado en **n8n**.

---

## 📁 Contenido

| Archivo | Descripción |
|---|---|
| `flujo-cotizacion.json` | Workflow completo, importable directamente en n8n |

---

## 🔁 Diagrama del flujo

```
┌─ Webhook WhatsApp In  (POST /webhook/whatsapp-cotizacion)
│
├─ Extraer datos del mensaje
│   └─ teléfono, nombre, texto, intención (cotizar | aprobar | rechazar)
│
├─ Switch por intención
│   │
│   ├─ COTIZAR
│   │   ├─ POST {API_URL}/cotizacion/generar  (la IA arma la cotización)
│   │   ├─ Formatear respuesta (items + total + ID)
│   │   ├─ Enviar al cliente por WhatsApp Business API
│   │   └─ Responder webhook a Meta
│   │
│   └─ APROBAR / RECHAZAR
│       ├─ Extraer ID de cotización del mensaje
│       ├─ IF aprobar → POST /cotizacion/:id/aprobar  → confirma al cliente
│       │   └─ IF rechazar → POST /cotizacion/:id/rechazar → cierra conversación
│       └─ Responder webhook a Meta
```

---

## 🚀 Importar en n8n

### Opción A — n8n Cloud o self-hosted

1. Abre tu instancia de n8n
2. **Workflows → Import from file** → selecciona `flujo-cotizacion.json`
3. Configura las **variables de entorno** del workflow (engranaje superior derecho):

   | Variable | Valor |
   |---|---|
   | `API_URL` | `https://app-gd-os.onrender.com` |
   | `WHATSAPP_PHONE_ID` | ID del número emisor de Meta |
   | `WHATSAPP_TOKEN` | Token de Meta Business API |
   | `WEBHOOK_SECRET` | Compartido con el backend (validación) |

4. **Activa el workflow** (toggle superior derecho)
5. Copia la URL del webhook que n8n te entrega (algo como
   `https://tu-n8n.cloud/webhook/whatsapp-cotizacion`)

### Opción B — Local con Docker

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  -e WEBHOOK_URL=https://tu-tunnel.ngrok.io \
  n8nio/n8n
```

Luego abre `http://localhost:5678` e importa el flujo.

---

## 🔧 Configurar webhook en Meta

Una vez tienes la URL del webhook de n8n:

1. Ve a **Meta for Developers → Tu app → WhatsApp → Configuration**
2. **Callback URL:** la URL del webhook de n8n
3. **Verify token:** el mismo valor que pusiste en `WEBHOOK_SECRET`
4. Suscríbete al evento `messages`

---

## 🧪 Probar el flujo

### 1. Cotización inicial
El cliente escribe por WhatsApp:
```
Necesito imprimir 100 lienzos de 2x3 metros para mi tienda
```

→ n8n llama a `/cotizacion/generar` → la IA arma la cotización → el cliente
recibe un mensaje formateado con items, total e ID de cotización.

### 2. Aprobación
El cliente responde:
```
SI ID 42
```

→ n8n detecta intención `aprobar` y extrae ID `42` → llama a
`POST /cotizacion/42/aprobar` → confirma al cliente y notifica al admin.

### 3. Rechazo
El cliente responde:
```
No gracias
```

→ n8n detecta intención `rechazar` → llama a `POST /cotizacion/:id/rechazar`
→ cierra la conversación con un mensaje de cortesía.

---

## ⚠️ Notas

- El backend de APP-GD-OS también tiene su propio endpoint `/webhook/whatsapp`
  que puede manejar el flujo sin n8n. **n8n se usa para reglas más complejas**
  (timeouts, reintentos, ramificaciones por contexto del cliente, etc.).
- El flujo está diseñado para ser **idempotente**: si Meta reenvía el mismo
  evento, n8n no genera duplicados (el backend valida por `whatsapp_message_id`).
- Para producción se recomienda activar **Error Workflow** en n8n para alertar
  por correo o Slack ante fallos del flujo.
