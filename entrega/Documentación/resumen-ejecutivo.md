# Resumen Ejecutivo — APP-GD-OS
**Global Design Operating System** · Tomás Escobar — Matías Ampuero · 2026

---

## 1. Descripción del sistema

APP-GD-OS es un ecosistema digital end-to-end para la empresa chilena de publicidad **Global Design**. Reemplaza procesos manuales (llamadas, papel, WhatsApp informal) con un sistema operativo unificado que cubre el ciclo completo de negocio: cotización por WhatsApp con IA → aprobación → asignación de instalador → ejecución con evidencia digital → acta firmada → monitoreo IoT continuo del parque de plotters.

Está compuesto por:
- **API REST** Node.js + Express en producción (`https://app-gd-os.onrender.com`)
- **App móvil** React Native + Expo con dos flujos diferenciados (instalador / admin)
- **Base de datos** PostgreSQL con 7 entidades, índices, constraints y 6 stored procedures
- **Orquestador** n8n para flujos avanzados de WhatsApp Business API
- **Simulador IoT** para demostraciones sin hardware real
- **Integraciones externas**: Cloudinary, OpenAI gpt-4o-mini, Meta Graph API v18, Expo Push API

---

## 2. Arquitectura general

El backend implementa una **arquitectura por capas estricta**:

```
Cliente (App / WhatsApp / Plotter IoT)
        │
        ▼
   Routes              ←  define endpoints, aplica middlewares
        │
        ▼
   Controllers         ←  parsea request, llama al service, formatea response
        │
        ▼
   Services            ←  lógica de negocio + acceso a BD vía pg
        │
        ▼
   PostgreSQL
```

**Regla:** ningún controller accede a la BD directamente; ningún route contiene lógica de negocio. Las integraciones externas (OpenAI, WhatsApp, Cloudinary, Expo Push) están encapsuladas en servicios dedicados.

Todas las respuestas siguen el formato estándar:
```json
{ "success": boolean, "message": "...", "data": any }
```

Los errores se manejan en un middleware central (`error.middleware.js`) que captura `AppError` con código HTTP, errores de express-validator y errores no controlados.

---

## 3. Endpoints documentados

### 🔐 Autenticación

| Método | Ruta | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/auth/login` | público | `{email, password, tipo: 'admin'\|'instalador'}` | `{token, usuario}` |
| POST | `/auth/push-token` | JWT | `{push_token}` | `null` |
| POST | `/auth/reset-demo` | `x-admin-secret` | — | `{rotadas, cuentas:[{email, password_nueva}]}` |

### 💬 WhatsApp Webhook

| Método | Ruta | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/webhook/whatsapp` | Meta challenge | — | challenge |
| POST | `/webhook/whatsapp` | público (Meta) | payload Meta | `{ok}` |

### 📋 Cotizaciones

| Método | Ruta | Auth | Body / Query | Response |
|---|---|---|---|---|
| GET | `/cotizacion` | admin | `?estado=&fecha=` | `[cotizacion]` |
| POST | `/cotizacion/generar` | público (interno) | `{telefono, nombre_cliente, descripcion}` | `{id, items, total}` |
| POST | `/cotizacion/:id/aprobar` | público (interno) | — | `{cotizacion}` |
| POST | `/cotizacion/:id/rechazar` | público (interno) | — | `{cotizacion}` |

### 👷 Instaladores e instalaciones

| Método | Ruta | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/instalador/mis-instalaciones` | instalador | — | `[instalacion]` |
| POST | `/instalacion/:id/completar` | instalador / admin | multipart: `foto`, `latitud`, `longitud`, `firma_base64` | `{instalacion, pdf_acta_url, numero_acta}` |

### 📡 IoT

| Método | Ruta | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/iot/plotter/:id/estado` | público (interno) | `{tipo, descripcion, porcentaje_avance, tiene_atasco, nivel_tinta, cola_trabajos}` | `{alerta_generada, alerta?}` |
| GET | `/iot/alertas/activas` | admin | — | `[alerta]` |
| POST | `/iot/alerta/:id/resolver` | admin | — | `{alerta}` |
| GET | `/iot/alerta/:id/estado` | público (interno) | — | `{id, tipo, resuelta, timestamp}` |

### 📊 Dashboard

| Método | Ruta | Auth | Query | Response |
|---|---|---|---|---|
| GET | `/dashboard/resumen` | admin | — | `{cotizaciones, instaladores, plotters, alertas}` |
| GET | `/dashboard/reportes` | admin | `?periodo=hoy\|semana\|mes` | `{cotizaciones_por_estado, serie_diaria, top_instaladores, horas_promedio_instalacion, alertas_por_plotter, total_facturado}` |

---

## 4. Variables de entorno requeridas

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto del servidor | `3000` |
| `NODE_ENV` | Entorno de ejecución | `production` |
| `DATABASE_URL` | Cadena de conexión PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secreto para firmar JWTs (≥32 chars) | `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | TTL del JWT | `7d` |
| `ADMIN_SECRET` | Secreto del endpoint `/auth/reset-demo` | `openssl rand -hex 32` |
| `CLOUDINARY_CLOUD_NAME` | Cloud name de Cloudinary | `app-gd-os` |
| `CLOUDINARY_API_KEY` | API key | — |
| `CLOUDINARY_API_SECRET` | API secret | — |
| `OPENAI_API_KEY` | Key de OpenAI | `sk-...` |
| `WHATSAPP_TOKEN` | Token de Meta Business | `EAA...` |
| `WHATSAPP_VERIFY_TOKEN` | Verify token del webhook | `mi_token_verificacion` |
| `WHATSAPP_PHONE_ID` | ID del número emisor | `1234567890` |

---

## 5. Despliegue paso a paso

### Backend en Render.com

1. **Crear servicio web**
   - Conectar el repo `TomEscobC/app-gd-os`
   - Root directory: `backend`
   - Build command: `npm ci`
   - Start command: `npm start`
   - Runtime: Node 20+

2. **Crear PostgreSQL** (Render → New → PostgreSQL)
   - Plan: Free
   - Copiar la **Internal Database URL** → pegar como `DATABASE_URL` del servicio web

3. **Configurar variables de entorno** del servicio web según la tabla anterior

4. **Ejecutar schema y seed** (vía DBeaver con la **External Database URL**):
   ```sql
   \i database/schema.sql
   \i database/migrations/002_acta_instalacion.sql
   \i entrega/Productos/Datos\ de\ Prueba/datos_prueba.sql
   ```

5. **Verificar**: `curl https://<tu-app>.onrender.com/health` → `{success:true}`

### App móvil

1. `cd mobile && npm install --legacy-peer-deps`
2. Actualizar `mobile/src/api/client.ts` apuntando a la URL del backend de Render
3. `npx expo start --tunnel`
4. Escanear QR con la app **Expo Go** desde tu teléfono

---

## 6. Instrucciones para la demo

### A. Login en la app
- **Admin** (toggle "Admin"): `admin@globaldesign.cl` / `Admin1234!` → llega al Dashboard
- **Instalador** (toggle "Instalador"): `roberto@globaldesign.cl` / `password` → llega a Mi Ruta

> ⚠️ **Antes de la presentación pública**, rotar las credenciales con el endpoint protegido:
> ```bash
> curl -X POST https://app-gd-os.onrender.com/auth/reset-demo \
>   -H "x-admin-secret: $ADMIN_SECRET"
> ```

### B. Simulador IoT (genera alertas en vivo)

En una terminal:
```bash
cd backend
npm run simulate:prod
# o personalizado:
PLOTTER_IDS=1 INTERVAL_SEG=15 ATASCO_PROB=0.3 npm run simulate:prod
```

Cada 15-30 segundos enviará telemetría al backend. Las alertas aparecerán en la pantalla **Alertas IoT** del admin (auto-refresh 15s). Cuando dispare un atasco, el simulador queda en pausa hasta que el admin lo **resuelva desde la app** — demostrando el ciclo completo.

### C. Flujo n8n (opcional, si se importa el workflow)

1. Importar `n8n/flujo-cotizacion.json` en una instancia n8n
2. Configurar las env vars del workflow (`API_URL`, `WHATSAPP_PHONE_ID`, `WHATSAPP_TOKEN`, `WEBHOOK_SECRET`)
3. Activar el workflow → copiar URL del webhook
4. Configurar la URL en **Meta for Developers** como callback
5. Probar enviando un WhatsApp al número configurado

### D. Recorrido sugerido para el profesor

1. **Login como admin** → muestra dashboard con stats del día
2. **Reportes** → cambia entre Hoy/Semana/Mes, muestra gráficos
3. **Mapa** → instaladores activos en OpenStreetMap
4. **Lanzar simulador IoT** → ve las alertas aparecer en vivo
5. **Resolver una alerta** desde la app → el simulador reanuda
6. **Logout → login como instalador** → Mi Ruta del día
7. **Completar una instalación** → foto + GPS + firma → muestra "Acta N° XXXXXX generada"
8. **Volver a admin** → Cotizaciones → aprobar/rechazar con confirmación

---

## 7. Mejoras destacadas implementadas

- **IA para cotizaciones** automáticas via OpenAI gpt-4o-mini
- **Flujo WhatsApp completo** orquestado con n8n (cotizar / aprobar / rechazar)
- **Push notifications** a admins ante alertas IoT (Expo Push API)
- **Firma digital** del cliente con `react-native-signature-canvas`
- **GPS** georreferenciado por instalación
- **Rate limiting** (100 req/15min general, 10 req/15min en auth)
- **Mapa en tiempo real** vía WebView + OpenStreetMap (compatible con Expo Go)
- **Reportería** con gráficos (pie + barras) y KPIs por periodo
- **Acta de Instalación PDF** generada automáticamente con foto y firma embebidas
- **Simulador IoT** independiente, controlable por env vars
- **Rotación de credenciales demo** vía endpoint protegido
- **Routing por rol** en mobile (admin → dashboard, instalador → ruta)

---

## 8. Estructura del repositorio

```
app-gd-os/
├── backend/                Node.js + Express
│   ├── src/
│   │   ├── routes/         Routes (auth, cotizacion, instalacion, iot, etc.)
│   │   ├── controllers/    Controllers (uno por dominio)
│   │   ├── services/       Lógica de negocio + acceso BD
│   │   ├── middlewares/    auth, role, validate, errorHandler, rateLimit
│   │   ├── config/         pool pg, cloudinary, multer storage
│   │   └── scripts/        plotter-simulator.js
│   ├── app.js              Entry point
│   ├── Dockerfile
│   └── package.json
├── database/
│   ├── schema.sql          DDL inicial
│   └── migrations/         Migraciones incrementales
├── mobile/                 React Native + Expo SDK 54
│   ├── app/
│   │   ├── (auth)/         Login
│   │   └── (app)/          Pantallas autenticadas
│   └── src/                api client, store zustand
├── n8n/
│   ├── flujo-cotizacion.json
│   └── README.md
├── entrega/                Documentación académica
│   ├── Documentación/      MER, UML, WireFrame, resumen-ejecutivo
│   ├── Productos/          Schema, datos prueba, stored procedures, ZIP
│   └── Gestión/            Integrantes
├── docker-compose.yml
└── README.md
```
