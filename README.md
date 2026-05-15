# APP-GD-OS — Global Design Operating System

Ecosistema digital para la empresa de publicidad **Global Design**.  
Gestiona cotizaciones automáticas por WhatsApp, trazabilidad de instalaciones en terreno y monitoreo IoT de plotters.

---

## Arquitectura

```
app-gd-os/
├── backend/               Node.js + Express (API REST)
│   ├── src/
│   │   ├── routes/        Define endpoints y aplica middlewares
│   │   ├── controllers/   Recibe request, llama al servicio, devuelve respuesta
│   │   ├── services/      Lógica de negocio y acceso a BD
│   │   ├── models/        Re-exporta el helper de BD
│   │   ├── middlewares/   Auth JWT, roles, validación, manejo de errores
│   │   └── config/        Pool PostgreSQL, Cloudinary
│   ├── app.js             Entry point
│   └── Dockerfile
├── database/
│   └── schema.sql         Tablas, índices y seed data
├── mobile/                App React Native / Expo (próxima iteración)
└── docker-compose.yml
```

**Regla de capas:** `Route → Controller → Service → BD`.  
Nunca lógica de negocio en rutas; nunca acceso a BD en controladores.

---

## Requisitos

| Herramienta | Versión mínima |
|-------------|---------------|
| Docker      | 24+           |
| Docker Compose | V2 (`docker compose`) |
| Node.js     | 20+ (solo para desarrollo local) |

---

## Inicio rápido

### 1. Clonar y configurar variables de entorno

```bash
git clone <repo-url>
cd app-gd-os

cp backend/.env.example backend/.env
# Editar backend/.env con tus credenciales reales
```

### 2. Generar hash de contraseña para el admin inicial

```bash
node -e "require('bcryptjs').hash('Admin1234!', 12, (e,h) => console.log(h))"
```

Copiar el resultado y reemplazar `$2a$12$REEMPLAZA_ESTE_HASH_...` en `database/schema.sql`.

### 3. Levantar todos los servicios

```bash
docker compose up --build
```

La API estará disponible en `http://localhost:3000`.  
PostgreSQL en `localhost:5432` (base de datos: `app_gd_os`).

### 4. Verificar

```bash
curl http://localhost:3000/health
# { "success": true, "message": "API operativa", ... }
```

---

## Variables de entorno (`backend/.env`)

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `PORT` | Puerto del servidor (default 3000) | No |
| `DATABASE_URL` | Connection string PostgreSQL | Sí |
| `JWT_SECRET` | Secreto para firmar tokens | Sí |
| `JWT_EXPIRES_IN` | Duración del token (ej. `7d`) | No |
| `CLOUDINARY_CLOUD_NAME` | Nombre del cloud en Cloudinary | Sí* |
| `CLOUDINARY_API_KEY` | API Key de Cloudinary | Sí* |
| `CLOUDINARY_API_SECRET` | API Secret de Cloudinary | Sí* |
| `OPENAI_API_KEY` | API Key de OpenAI (cotizaciones IA) | No** |
| `WHATSAPP_TOKEN` | Token de la API de WhatsApp Business | No** |
| `WHATSAPP_VERIFY_TOKEN` | Token de verificación del webhook | No** |
| `WHATSAPP_PHONE_ID` | Phone Number ID de Meta | No** |

> \* Requerida para el endpoint `POST /instalacion/:id/completar` (subida de fotos).  
> \*\* Sin estas variables el sistema funciona con mocks y mensajes de consola.

---

## Endpoints

### Auth
| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/auth/login` | Login admin o instalador → JWT | — |

**Body:**
```json
{ "email": "...", "password": "...", "tipo": "admin | instalador" }
```

### WhatsApp
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/webhook/whatsapp` | Verificación del webhook (Meta) |
| POST | `/webhook/whatsapp` | Recepción de mensajes entrantes |

### Cotizaciones
| Método | Ruta | Auth |
|--------|------|------|
| POST | `/cotizacion/:id/aprobar` | admin / superadmin |
| POST | `/cotizacion/:id/rechazar` | admin / superadmin |

### Instaladores & Instalaciones
| Método | Ruta | Auth |
|--------|------|------|
| GET | `/instalador/:id/ruta` | instalador / admin |
| POST | `/instalacion/:id/completar` | instalador / admin |

`completar` acepta `multipart/form-data` con campos: `foto` (archivo), `latitud`, `longitud`.

### IoT
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/iot/plotter/:id/estado` | Payload del plotter cada 30 s |
| GET  | `/iot/alertas/activas` | Listar alertas sin resolver (admin) |
| POST | `/iot/alerta/:id/resolver` | Marcar alerta como resuelta (admin) |
| GET  | `/iot/alerta/:id/estado` | Estado liviano (uso del simulador IoT) |

**Payload estado plotter:**
```json
{
  "tipo": "tinta_baja",
  "descripcion": "Nivel de tinta cian por debajo del mínimo",
  "porcentaje_avance": 7.5,
  "tiene_atasco": false
}
```

Si `tiene_atasco: true` o `porcentaje_avance < 10`, se genera una `alerta_iot` y se notifica a los admins por WhatsApp.

### Dashboard
| Método | Ruta | Auth |
|--------|------|------|
| GET | `/dashboard/resumen` | admin / superadmin |

**Respuesta:**
```json
{
  "cotizaciones": { "aprobadas": 3, "pendientes": 1, "rechazadas": 0, "total": 4, "monto_aprobado": "450000" },
  "instaladores": [...],
  "plotters": [...],
  "alertas": [...]
}
```

---

## Formato de respuesta estándar

Todas las respuestas siguen la misma estructura:

```json
{
  "success": true | false,
  "message": "Descripción del resultado",
  "data": { ... } | null
}
```

Los errores de validación devuelven `status 400` con `data` conteniendo el array de errores de `express-validator`.

---

## Desarrollo local (sin Docker)

```bash
cd backend
npm install
# Tener PostgreSQL corriendo localmente y ajustar DATABASE_URL en .env
npm run dev
```

---

## Flujo de cotización por WhatsApp

```
Cliente escribe "quiero cotizar un letrero LED de 2m²"
  └─ n8n (webhook) → POST /webhook/whatsapp
       └─ webhook.service → ia.service (OpenAI)
            └─ Genera cotización JSON
                 └─ Guarda cotizacion en BD (estado: pendiente)
                      └─ Responde al cliente con desglose + total
                           └─ Cliente responde "APROBAR"
                                └─ Actualiza cotizacion a estado: aprobada
```

---

## 🤖 Simulador IoT (demo)

Para demostrar el flujo de alertas IoT sin hardware real, el backend incluye un
simulador que envía telemetría periódica al endpoint `/iot/plotter/:id/estado`.

```bash
# Contra el backend local
cd backend
npm run simulate

# Contra producción (Render)
npm run simulate:prod

# Con plotters específicos e intervalo custom
PLOTTER_IDS=1,2 INTERVAL_SEG=15 npm run simulate
```

Genera con probabilidad configurable atascos y alertas de tinta baja.
Cuando dispara un atasco, hace **polling** al endpoint
`GET /iot/alerta/:id/estado` y reanuda la operación normal **una vez que el
admin resuelve la alerta desde la app móvil**, demostrando el ciclo completo
de detección → notificación → resolución.

---

## 📡 Orquestación WhatsApp con n8n

El directorio `n8n/` contiene el flujo `flujo-cotizacion.json` importable que
maneja:

- Recepción del mensaje del cliente vía webhook de Meta
- Detección de intención (cotizar / aprobar / rechazar)
- Llamada al backend para generar la cotización con IA
- Formateo y envío de la respuesta al cliente
- Manejo de aprobación / rechazo y confirmación al cliente
- Notificación al admin cuando una cotización es aprobada

Ver instrucciones de importación y configuración en [`n8n/README.md`](./n8n/README.md).

---

## Stack tecnológico

- **Runtime:** Node.js 20 + Express 4
- **BD:** PostgreSQL 16 (pg driver, SQL raw)
- **Auth:** JWT + bcryptjs
- **Fotos:** Cloudinary (multer-storage-cloudinary)
- **IA:** OpenAI gpt-4o-mini
- **Mensajería:** WhatsApp Business API (Meta Graph API v18)
- **Contenedores:** Docker + Docker Compose
