-- ============================================================
-- Datos de Prueba — APP-GD-OS
-- Autores: Tomás Escobar, Matías Ampuero
-- ============================================================

-- ── Clientes ────────────────────────────────────────────────
INSERT INTO cliente (nombre, telefono, email, fecha_registro) VALUES
  ('Juan Pérez',       '+56912345678', 'juan.perez@email.cl',     NOW() - INTERVAL '30 days'),
  ('María González',   '+56923456789', 'maria.gonzalez@email.cl', NOW() - INTERVAL '20 days'),
  ('Carlos Muñoz',     '+56934567890', 'carlos.munoz@email.cl',   NOW() - INTERVAL '15 days'),
  ('Ana Rodríguez',    '+56945678901', 'ana.rodriguez@email.cl',  NOW() - INTERVAL '10 days'),
  ('Pedro Soto',       '+56956789012', 'pedro.soto@email.cl',     NOW() - INTERVAL '5 days')
ON CONFLICT DO NOTHING;

-- ── Administradores ─────────────────────────────────────────
-- Contraseña de todos: Admin1234!
INSERT INTO usuario_admin (nombre, email, password_hash, rol, telefono) VALUES
  ('Tomás Escobar',  'admin@globaldesign.cl',  '$2a$12$hVOnk2ZV.ujJKgbQjcoBzuFNbamvbvJOhle17vzzkulnoY5RHR6Le', 'superadmin', '+56911111111'),
  ('Matías Ampuero', 'matias@globaldesign.cl', '$2a$12$hVOnk2ZV.ujJKgbQjcoBzuFNbamvbvJOhle17vzzkulnoY5RHR6Le', 'admin',      '+56922222222')
ON CONFLICT (email) DO NOTHING;

-- ── Instaladores ────────────────────────────────────────────
-- Contraseña de todos: Install1234!
-- Hash: $2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
INSERT INTO instalador (nombre, email, password_hash, estado) VALUES
  ('Roberto Fuentes', 'roberto@globaldesign.cl', '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'activo'),
  ('Diego Herrera',   'diego@globaldesign.cl',   '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'activo'),
  ('Felipe Castro',   'felipe@globaldesign.cl',  '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'inactivo')
ON CONFLICT (email) DO NOTHING;

-- ── Plotters ────────────────────────────────────────────────
INSERT INTO plotter (modelo, ubicacion, activo) VALUES
  ('Roland TrueVIS VG3-640',  'Taller Principal - Santiago',  true),
  ('Mimaki JV300-160',        'Taller Secundario - Santiago', true),
  ('Epson SureColor S80600',  'Bodega - Pudahuel',            false)
ON CONFLICT DO NOTHING;

-- ── Cotizaciones ────────────────────────────────────────────
INSERT INTO cotizacion (cliente_id, fecha, estado, total, items_detalle) VALUES
  (1, NOW() - INTERVAL '10 days', 'aprobada',  340000,
   '[{"descripcion":"Letrero LED 2m²","cantidad":1,"precio":170000},{"descripcion":"Instalación","cantidad":1,"precio":170000}]'),
  (2, NOW() - INTERVAL '7 days',  'aprobada',  96000,
   '[{"descripcion":"Vinilo ventana 4m² x 2 láminas","cantidad":2,"precio":48000}]'),
  (3, NOW() - INTERVAL '5 days',  'pendiente', 64000,
   '[{"descripcion":"Banner exterior 8m²","cantidad":1,"precio":64000}]'),
  (4, NOW() - INTERVAL '3 days',  'rechazada', 255000,
   '[{"descripcion":"Letrero LED 3m²","cantidad":1,"precio":255000}]'),
  (5, NOW(),                      'pendiente', 48000,
   '[{"descripcion":"Vinilo decorativo 4m²","cantidad":1,"precio":48000}]');

-- ── Instalaciones ───────────────────────────────────────────
INSERT INTO instalacion (instalador_id, cotizacion_id, fecha, foto_evidencia_url, latitud, longitud, estado) VALUES
  (1, 1, NOW() - INTERVAL '8 days',  'https://res.cloudinary.com/demo/image/upload/sample.jpg', -33.4489, -70.6693, 'completada'),
  (2, 2, NOW() - INTERVAL '5 days',  'https://res.cloudinary.com/demo/image/upload/sample.jpg', -33.4372, -70.6506, 'completada'),
  (1, 3, NOW(),                       NULL, -33.4569, -70.6483, 'pendiente');

-- ── Alertas IoT ─────────────────────────────────────────────
INSERT INTO alerta_iot (plotter_id, tipo, descripcion, porcentaje_avance, tiene_atasco, timestamp, resuelta) VALUES
  (1, 'tinta_baja', 'Nivel de tinta cian por debajo del 10%',  8.5,  false, NOW() - INTERVAL '2 days', true),
  (1, 'atasco',     'Atasco de material detectado en cabezal', NULL, true,  NOW() - INTERVAL '1 day',  true),
  (2, 'tinta_baja', 'Nivel de tinta magenta crítico',          5.0,  false, NOW() - INTERVAL '3 hours', false),
  (2, 'atasco',     'Atasco en alimentador de papel',          NULL, true,  NOW() - INTERVAL '1 hour',  false);
