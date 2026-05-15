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

---

## 5. Diagrama de Secuencia — Flujo n8n WhatsApp completo

```mermaid
sequenceDiagram
    autonumber
    actor Cliente
    participant WA as WhatsApp<br/>Business
    participant N8N as n8n<br/>(orquestador)
    participant API as Backend API
    participant IA as OpenAI<br/>gpt-4o-mini
    participant DB as PostgreSQL
    actor Admin

    Note over Cliente,WA: 1) Cliente solicita cotización
    Cliente->>WA: "Necesito 100 lienzos 2x3m"
    WA->>N8N: webhook entrante (POST)
    N8N->>N8N: Extraer intención: "cotizar"
    N8N->>API: POST /cotizacion/generar
    API->>IA: Prompt con descripción
    IA-->>API: JSON con items y total
    API->>DB: INSERT cotizacion (estado=pendiente)
    DB-->>API: cotización #42
    API-->>N8N: { id:42, items, total }

    N8N->>N8N: Formatear mensaje con items + ID
    N8N->>WA: enviar resumen al cliente
    WA->>Cliente: "Total $450.000 — Responde SI o NO (ID:42)"

    Note over Cliente,WA: 2) Cliente aprueba
    Cliente->>WA: "SI ID 42"
    WA->>N8N: webhook
    N8N->>N8N: Extraer intención: "aprobar" + ID:42
    N8N->>API: POST /cotizacion/42/aprobar
    API->>DB: UPDATE estado='aprobada'
    API->>Admin: push notification
    API-->>N8N: ok
    N8N->>WA: "Cotización aprobada"
    WA->>Cliente: "✅ Coordinaremos instalación"
```

---

## 6. Diagrama de Secuencia — Completar Instalación con Acta PDF

```mermaid
sequenceDiagram
    autonumber
    actor Instalador
    participant APP as App Móvil
    participant API as Backend API
    participant CLD as Cloudinary
    participant DB as PostgreSQL
    participant PDF as pdf.service
    actor Cliente

    Instalador->>APP: Toca "Completar"
    APP->>APP: Captura foto (cámara)
    APP->>APP: Solicita GPS (expo-location)
    APP->>Cliente: Pantalla de firma (SignatureCanvas)
    Cliente-->>APP: Firma como base64 PNG

    APP->>API: POST /instalacion/:id/completar<br/>(multipart: foto, lat, lon, firma_base64)
    API->>CLD: subir foto
    CLD-->>API: foto_url
    API->>DB: UPDATE instalacion SET estado='completada',<br/>foto, lat, lon, firma_cliente
    DB-->>API: instalación actualizada

    API->>DB: SELECT cliente, cotización, instalador
    API->>PDF: generarActaInstalacion(...)
    PDF->>CLD: descargar foto (Buffer)
    CLD-->>PDF: imagen
    PDF->>PDF: Renderizar A4 con PDFKit:<br/>header, datos, foto, firma
    PDF->>CLD: subir PDF (resource_type=raw)
    CLD-->>PDF: pdf_acta_url
    PDF-->>API: pdf_acta_url

    API->>DB: UPDATE instalacion SET pdf_acta_url
    API-->>APP: { instalacion, pdf_acta_url, numero_acta }
    APP->>Instalador: "Acta N° 000042 generada ✅"
```
