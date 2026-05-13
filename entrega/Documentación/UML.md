# UML — APP-GD-OS
**Global Design Operating System | Tomás Escobar — Matías Ampuero | 2026**

---

## 1. Diagrama de Componentes — Arquitectura por Capas

```mermaid
graph LR
    subgraph Clientes
        APP["📱 App Móvil\nExpo"]
        WA["💬 WhatsApp\nBusiness"]
        IOT["⚙️ Plotter\nIoT"]
        WEB["🖥️ Dashboard\nAdmin"]
    end

    subgraph API["Backend Node.js + Express"]
        subgraph Routes
            R1[auth.routes]
            R2[webhook.routes]
            R3[cotizacion.routes]
            R4[instalador.routes]
            R5[instalacion.routes]
            R6[iot.routes]
            R7[dashboard.routes]
        end

        subgraph Controllers
            C1[auth.controller]
            C2[webhook.controller]
            C3[cotizacion.controller]
            C4[instalador.controller]
            C5[instalacion.controller]
            C6[iot.controller]
            C7[dashboard.controller]
        end

        subgraph Services
            S1[auth.service]
            S2[webhook.service]
            S3[cotizacion.service]
            S4[instalador.service]
            S5[instalacion.service]
            S6[iot.service]
            S7[dashboard.service]
            S8[ia.service]
            S9[whatsapp.service]
        end

        subgraph Middlewares
            M1[verifyToken]
            M2[requireRole]
            M3[validate]
            M4[errorHandler]
        end
    end

    subgraph Externos["Servicios Externos"]
        DB[(PostgreSQL)]
        CLD[Cloudinary]
        OAI[OpenAI API]
        WAS[WhatsApp API]
    end

    APP & WA & IOT & WEB --> Routes
    Routes --> Middlewares
    Middlewares --> Controllers
    Controllers --> Services
    Services --> DB
    Services --> CLD
    Services --> OAI
    Services --> WAS
```

---

## 2. Diagrama de Clases — Servicios

```mermaid
classDiagram
    class AuthService {
        +login(email, password, tipo) JWT
    }

    class CotizacionService {
        +actualizarEstado(id, estado) Cotizacion
        +crearCotizacion(datos) Cotizacion
        +getCotizacionById(id) Cotizacion
    }

    class InstaladorService {
        +getRutaDelDia(instaladorId) Instalacion[]
    }

    class InstalacionService {
        +completarInstalacion(id, datos) Instalacion
    }

    class IotService {
        +procesarEstado(plotterId, payload) Resultado
        +resolverAlerta(alertaId) Alerta
        -detectarTipoAlerta(payload) string
        -notificarAdmins(plotter, alerta) void
    }

    class WebhookService {
        +procesarMensaje(body) void
        -procesarSolicitudCotizacion(tel, txt) void
        -procesarAprobacion(telefono) void
        -procesarRechazo(telefono) void
        -buscarOCrearCliente(telefono) Cliente
    }

    class DashboardService {
        +getResumenDelDia() Resumen
        -getCotizacionesDelDia() Stats
        -getInstaladorersActivos() Instalador[]
        -getEstadoPlotters() Plotter[]
        -getAlertasPendientes() Alerta[]
    }

    class IaService {
        +generarCotizacion(descripcion) CotizacionIA
        -cotizacionFallback(descripcion) CotizacionIA
    }

    class WhatsappService {
        +enviarMensaje(telefono, mensaje) void
    }

    WebhookService --> CotizacionService : usa
    WebhookService --> IaService : usa
    WebhookService --> WhatsappService : usa
    IotService --> WhatsappService : usa
```

---

## 3. Diagrama de Secuencia — Flujo WhatsApp

```mermaid
sequenceDiagram
    actor Cliente
    participant WA as WhatsApp API
    participant API as POST /webhook/whatsapp
    participant WS as webhook.service
    participant IA as ia.service
    participant CS as cotizacion.service
    participant DB as PostgreSQL
    participant WAS as whatsapp.service

    Cliente->>WA: "quiero cotizar letrero LED 2m²"
    WA->>API: webhook POST (payload)
    API->>WS: procesarMensaje(body)
    WS->>IA: generarCotizacion(texto)
    IA-->>WS: { items, total }
    WS->>CS: crearCotizacion(datos)
    CS->>DB: INSERT cotizacion (pendiente)
    DB-->>CS: cotizacion creada
    CS-->>WS: cotizacion
    WS->>WAS: enviarMensaje(telefono, detalle)
    WAS-->>Cliente: Cotización #3 — $170.000 ✅\nAPROBAR / RECHAZAR

    Cliente->>WA: "APROBAR"
    WA->>API: webhook POST
    API->>WS: procesarMensaje(body)
    WS->>CS: actualizarEstado(id, aprobada)
    CS->>DB: UPDATE cotizacion SET estado=aprobada
    WS->>WAS: enviarMensaje(confirmación)
    WAS-->>Cliente: ¡Cotización aprobada! 🎉
```

---

## 4. Diagrama de Secuencia — Flujo IoT

```mermaid
sequenceDiagram
    participant PLT as Plotter IoT
    participant API as POST /iot/plotter/:id/estado
    participant IS as iot.service
    participant DB as PostgreSQL
    participant WAS as whatsapp.service
    actor Admin

    loop Cada 30 segundos
        PLT->>API: payload { tiene_atasco: true }
        API->>IS: procesarEstado(plotterId, payload)
        IS->>DB: SELECT plotter WHERE activo
        DB-->>IS: plotter encontrado
        IS->>IS: detectarTipoAlerta() → "atasco"
        IS->>DB: INSERT alerta_iot
        DB-->>IS: alerta creada
        IS->>DB: SELECT admins con telefono
        IS->>WAS: enviarMensaje(admin, alerta)
        WAS-->>Admin: 🔴 Alerta — Roland VG3-640\nAtasco detectado
    end

    Admin->>API: POST /iot/alerta/:id/resolver
    API->>IS: resolverAlerta(alertaId)
    IS->>DB: UPDATE alerta_iot SET resuelta=true
    DB-->>IS: alerta resuelta
```
