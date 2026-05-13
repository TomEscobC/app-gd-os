-- ============================================================
-- Procedimientos Almacenados — APP-GD-OS
-- Autores: Tomás Escobar, Matías Ampuero
-- ============================================================

-- ── PA 1: Obtener ruta del día de un instalador ──────────────
CREATE OR REPLACE FUNCTION sp_obtener_ruta_instalador(p_instalador_id INT)
RETURNS TABLE (
  instalacion_id    INT,
  fecha             TIMESTAMPTZ,
  estado            VARCHAR,
  latitud           DOUBLE PRECISION,
  longitud          DOUBLE PRECISION,
  cotizacion_id     INT,
  items_detalle     JSONB,
  total             NUMERIC,
  cliente_nombre    VARCHAR,
  cliente_telefono  VARCHAR
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.fecha,
    i.estado,
    i.latitud,
    i.longitud,
    c.id,
    c.items_detalle,
    c.total,
    cl.nombre,
    cl.telefono
  FROM instalacion i
  JOIN cotizacion c  ON i.cotizacion_id = c.id
  JOIN cliente    cl ON c.cliente_id    = cl.id
  WHERE i.instalador_id = p_instalador_id
    AND DATE(i.fecha) = CURRENT_DATE
  ORDER BY i.fecha ASC;
END;
$$;

-- Uso: SELECT * FROM sp_obtener_ruta_instalador(1);


-- ── PA 2: Completar una instalación ─────────────────────────
CREATE OR REPLACE FUNCTION sp_completar_instalacion(
  p_instalacion_id     INT,
  p_latitud            DOUBLE PRECISION,
  p_longitud           DOUBLE PRECISION,
  p_foto_evidencia_url TEXT
)
RETURNS instalacion
LANGUAGE plpgsql AS $$
DECLARE
  v_instalacion instalacion;
BEGIN
  SELECT * INTO v_instalacion FROM instalacion WHERE id = p_instalacion_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Instalación % no encontrada', p_instalacion_id;
  END IF;

  IF v_instalacion.estado = 'completada' THEN
    RAISE EXCEPTION 'La instalación % ya fue completada', p_instalacion_id;
  END IF;

  UPDATE instalacion
  SET estado             = 'completada',
      latitud            = p_latitud,
      longitud           = p_longitud,
      foto_evidencia_url = p_foto_evidencia_url,
      fecha              = NOW()
  WHERE id = p_instalacion_id
  RETURNING * INTO v_instalacion;

  RETURN v_instalacion;
END;
$$;

-- Uso: SELECT * FROM sp_completar_instalacion(1, -33.4489, -70.6693, 'https://url-foto.jpg');


-- ── PA 3: Resumen del dashboard del día ─────────────────────
CREATE OR REPLACE FUNCTION sp_resumen_dashboard()
RETURNS JSON
LANGUAGE plpgsql AS $$
DECLARE
  v_cotizaciones JSON;
  v_instaladores JSON;
  v_alertas      JSON;
BEGIN
  SELECT json_build_object(
    'total',          COUNT(*),
    'aprobadas',      COUNT(*) FILTER (WHERE estado = 'aprobada'),
    'pendientes',     COUNT(*) FILTER (WHERE estado = 'pendiente'),
    'rechazadas',     COUNT(*) FILTER (WHERE estado = 'rechazada'),
    'monto_aprobado', COALESCE(SUM(total) FILTER (WHERE estado = 'aprobada'), 0)
  ) INTO v_cotizaciones
  FROM cotizacion
  WHERE DATE(fecha) = CURRENT_DATE;

  SELECT json_agg(json_build_object(
    'id',                ins.id,
    'nombre',            ins.nombre,
    'instalaciones_hoy', COUNT(i.id),
    'completadas_hoy',   COUNT(i.id) FILTER (WHERE i.estado = 'completada')
  )) INTO v_instaladores
  FROM instalador ins
  LEFT JOIN instalacion i
    ON i.instalador_id = ins.id AND DATE(i.fecha) = CURRENT_DATE
  WHERE ins.estado = 'activo'
  GROUP BY ins.id, ins.nombre;

  SELECT json_agg(json_build_object(
    'id',               a.id,
    'tipo',             a.tipo,
    'descripcion',      a.descripcion,
    'plotter_modelo',   p.modelo,
    'plotter_ubicacion',p.ubicacion,
    'timestamp',        a.timestamp
  )) INTO v_alertas
  FROM alerta_iot a
  JOIN plotter p ON a.plotter_id = p.id
  WHERE a.resuelta = false
  ORDER BY a.timestamp DESC;

  RETURN json_build_object(
    'cotizaciones', v_cotizaciones,
    'instaladores', COALESCE(v_instaladores, '[]'::json),
    'alertas',      COALESCE(v_alertas, '[]'::json)
  );
END;
$$;

-- Uso: SELECT sp_resumen_dashboard();


-- ── PA 4: Registrar alerta IoT y retornarla ──────────────────
CREATE OR REPLACE FUNCTION sp_registrar_alerta_iot(
  p_plotter_id        INT,
  p_tipo              VARCHAR,
  p_descripcion       TEXT,
  p_porcentaje_avance NUMERIC DEFAULT NULL,
  p_tiene_atasco      BOOLEAN DEFAULT false
)
RETURNS alerta_iot
LANGUAGE plpgsql AS $$
DECLARE
  v_alerta alerta_iot;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM plotter WHERE id = p_plotter_id AND activo = true) THEN
    RAISE EXCEPTION 'Plotter % no encontrado o inactivo', p_plotter_id;
  END IF;

  INSERT INTO alerta_iot (plotter_id, tipo, descripcion, porcentaje_avance, tiene_atasco, timestamp, resuelta)
  VALUES (p_plotter_id, p_tipo, p_descripcion, p_porcentaje_avance, p_tiene_atasco, NOW(), false)
  RETURNING * INTO v_alerta;

  RETURN v_alerta;
END;
$$;

-- Uso: SELECT * FROM sp_registrar_alerta_iot(1, 'tinta_baja', 'Tinta cian al 8%', 8.0, false);


-- ── PA 5: Resolver alerta IoT ────────────────────────────────
CREATE OR REPLACE FUNCTION sp_resolver_alerta(p_alerta_id INT)
RETURNS alerta_iot
LANGUAGE plpgsql AS $$
DECLARE
  v_alerta alerta_iot;
BEGIN
  UPDATE alerta_iot
  SET resuelta = true
  WHERE id = p_alerta_id
  RETURNING * INTO v_alerta;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Alerta % no encontrada', p_alerta_id;
  END IF;

  RETURN v_alerta;
END;
$$;

-- Uso: SELECT * FROM sp_resolver_alerta(1);


-- ── PA 6: Actualizar estado de cotización ────────────────────
CREATE OR REPLACE FUNCTION sp_actualizar_estado_cotizacion(
  p_cotizacion_id INT,
  p_estado        VARCHAR
)
RETURNS cotizacion
LANGUAGE plpgsql AS $$
DECLARE
  v_cotizacion cotizacion;
BEGIN
  IF p_estado NOT IN ('pendiente', 'aprobada', 'rechazada') THEN
    RAISE EXCEPTION 'Estado inválido: %. Use pendiente, aprobada o rechazada', p_estado;
  END IF;

  UPDATE cotizacion
  SET estado = p_estado
  WHERE id = p_cotizacion_id
  RETURNING * INTO v_cotizacion;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cotización % no encontrada', p_cotizacion_id;
  END IF;

  RETURN v_cotizacion;
END;
$$;

-- Uso: SELECT * FROM sp_actualizar_estado_cotizacion(1, 'aprobada');
