-- ============================================================
-- Schema SQL — APP-GD-OS (Global Design Operating System)
-- ============================================================

-- ── Tabla: cliente ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cliente (
  id              SERIAL PRIMARY KEY,
  nombre          VARCHAR(150) NOT NULL,
  telefono        VARCHAR(30)  UNIQUE,
  email           VARCHAR(150) UNIQUE,
  fecha_registro  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Tabla: usuario_admin ────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuario_admin (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(150) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,
  rol           VARCHAR(30)  NOT NULL DEFAULT 'admin'
                  CHECK (rol IN ('admin', 'superadmin')),
  telefono      VARCHAR(30),
  creado_en     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Tabla: instalador ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS instalador (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(150) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,
  token_jwt     TEXT,
  estado        VARCHAR(20)  NOT NULL DEFAULT 'activo'
                  CHECK (estado IN ('activo', 'inactivo')),
  creado_en     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Tabla: cotizacion ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS cotizacion (
  id            SERIAL PRIMARY KEY,
  cliente_id    INT          NOT NULL REFERENCES cliente(id) ON DELETE RESTRICT,
  fecha         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  estado        VARCHAR(20)  NOT NULL DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  total         NUMERIC(12, 2) NOT NULL DEFAULT 0,
  pdf_url       TEXT,
  items_detalle JSONB        NOT NULL DEFAULT '[]'
);

-- ── Tabla: instalacion ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS instalacion (
  id                  SERIAL PRIMARY KEY,
  instalador_id       INT    NOT NULL REFERENCES instalador(id) ON DELETE RESTRICT,
  cotizacion_id       INT    NOT NULL REFERENCES cotizacion(id) ON DELETE RESTRICT,
  fecha               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  foto_evidencia_url  TEXT,
  latitud             DOUBLE PRECISION,
  longitud            DOUBLE PRECISION,
  estado              VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                        CHECK (estado IN ('pendiente', 'en_progreso', 'completada', 'cancelada'))
);

-- ── Tabla: plotter ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plotter (
  id          SERIAL PRIMARY KEY,
  modelo      VARCHAR(100) NOT NULL,
  ubicacion   VARCHAR(200),
  activo      BOOLEAN      NOT NULL DEFAULT true,
  creado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Tabla: alerta_iot ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerta_iot (
  id                SERIAL PRIMARY KEY,
  plotter_id        INT    NOT NULL REFERENCES plotter(id) ON DELETE RESTRICT,
  tipo              VARCHAR(50)    NOT NULL,           -- 'atasco' | 'tinta_baja' | 'error'
  descripcion       TEXT,
  porcentaje_avance NUMERIC(5, 2),
  tiene_atasco      BOOLEAN        NOT NULL DEFAULT false,
  timestamp         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  resuelta          BOOLEAN        NOT NULL DEFAULT false
);

-- ── Índices de rendimiento ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cotizacion_cliente_id  ON cotizacion(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cotizacion_estado      ON cotizacion(estado);
CREATE INDEX IF NOT EXISTS idx_cotizacion_fecha       ON cotizacion(fecha);
CREATE INDEX IF NOT EXISTS idx_instalacion_instalador ON instalacion(instalador_id);
CREATE INDEX IF NOT EXISTS idx_instalacion_fecha      ON instalacion(fecha);
CREATE INDEX IF NOT EXISTS idx_alerta_plotter_id      ON alerta_iot(plotter_id);
CREATE INDEX IF NOT EXISTS idx_alerta_resuelta        ON alerta_iot(resuelta);
CREATE INDEX IF NOT EXISTS idx_alerta_timestamp       ON alerta_iot(timestamp);
CREATE INDEX IF NOT EXISTS idx_cliente_telefono       ON cliente(telefono);

-- ── Datos semilla ────────────────────────────────────────────
-- Contraseña por defecto: Admin1234!  (cambiar en producción)
INSERT INTO usuario_admin (nombre, email, password_hash, rol, telefono)
VALUES (
  'Administrador',
  'admin@globaldesign.cl',
  '$2a$12$hVOnk2ZV.ujJKgbQjcoBzuFNbamvbvJOhle17vzzkulnoY5RHR6Le',
  'superadmin',
  NULL
) ON CONFLICT (email) DO NOTHING;

-- Plotter de ejemplo
INSERT INTO plotter (modelo, ubicacion)
VALUES ('Roland TrueVIS VG3-640', 'Taller Principal - Santiago')
ON CONFLICT DO NOTHING;
