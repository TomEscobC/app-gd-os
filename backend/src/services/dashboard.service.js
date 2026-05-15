const { query } = require('../config/database');
const { AppError } = require('../middlewares/error.middleware');

// ── Resumen del día (legacy, usado por la home admin) ─────────────
const getResumenDelDia = async () => {
  const [cotizaciones, instaladores, plotters, alertas] = await Promise.all([
    getCotizacionesDelDia(),
    getInstaladorersActivos(),
    getEstadoPlotters(),
    getAlertasPendientes(),
  ]);

  return { cotizaciones, instaladores, plotters, alertas };
};

const getCotizacionesDelDia = async () => {
  const result = await query(
    `SELECT
       COUNT(*) FILTER (WHERE estado = 'aprobada')  AS aprobadas,
       COUNT(*) FILTER (WHERE estado = 'pendiente') AS pendientes,
       COUNT(*) FILTER (WHERE estado = 'rechazada') AS rechazadas,
       COUNT(*)                                     AS total,
       COALESCE(SUM(total) FILTER (WHERE estado = 'aprobada'), 0) AS monto_aprobado
     FROM cotizacion
     WHERE DATE(fecha) = CURRENT_DATE`
  );
  return result.rows[0];
};

const getInstaladorersActivos = async () => {
  const result = await query(
    `SELECT
       ins.id,
       ins.nombre,
       MAX(i.latitud)  AS ultima_latitud,
       MAX(i.longitud) AS ultima_longitud,
       COUNT(i.id)     AS instalaciones_hoy,
       COUNT(i.id) FILTER (WHERE i.estado = 'completada') AS completadas_hoy
     FROM instalador ins
     LEFT JOIN instalacion i
       ON i.instalador_id = ins.id AND DATE(i.fecha) = CURRENT_DATE
     WHERE ins.estado = 'activo'
     GROUP BY ins.id, ins.nombre`
  );
  return result.rows;
};

const getEstadoPlotters = async () => {
  const result = await query(
    `SELECT
       p.*,
       (SELECT row_to_json(a)
        FROM (
          SELECT * FROM alerta_iot
          WHERE plotter_id = p.id AND resuelta = false
          ORDER BY timestamp DESC LIMIT 1
        ) a
       ) AS ultima_alerta_activa
     FROM plotter p
     WHERE p.activo = true`
  );
  return result.rows;
};

const getAlertasPendientes = async () => {
  const result = await query(
    `SELECT a.*, p.modelo AS plotter_modelo, p.ubicacion AS plotter_ubicacion
     FROM alerta_iot a
     JOIN plotter p ON a.plotter_id = p.id
     WHERE a.resuelta = false
     ORDER BY a.timestamp DESC`
  );
  return result.rows;
};

// ── Reportería extendida ──────────────────────────────────────────
const PERIODOS = {
  hoy:    "DATE_TRUNC('day',   NOW())",
  semana: "DATE_TRUNC('week',  NOW())",
  mes:    "DATE_TRUNC('month', NOW())",
};

/**
 * Construye un reporte agregado para el panel de admin.
 * @param {('hoy'|'semana'|'mes')} periodo
 */
const getReportes = async (periodo = 'hoy') => {
  if (!PERIODOS[periodo]) {
    throw new AppError('Periodo inválido. Usa: hoy | semana | mes', 400);
  }
  const desde = PERIODOS[periodo];

  const [
    cotizacionesPorEstado,
    serieDiaria,
    topInstaladores,
    tiempoPromedioAprobacion,
    alertasPorPlotter,
    facturacion,
  ] = await Promise.all([
    query(
      `SELECT estado, COUNT(*)::int AS total, COALESCE(SUM(total), 0) AS monto
         FROM cotizacion
        WHERE fecha >= ${desde}
        GROUP BY estado`
    ).then(r => r.rows),

    query(
      `SELECT DATE(fecha) AS dia,
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE estado = 'aprobada')::int AS aprobadas
         FROM cotizacion
        WHERE fecha >= ${desde}
        GROUP BY DATE(fecha)
        ORDER BY dia ASC`
    ).then(r => r.rows),

    query(
      `SELECT ins.id, ins.nombre,
              COUNT(i.id) FILTER (WHERE i.estado = 'completada')::int AS completadas,
              COUNT(i.id)::int AS total
         FROM instalador ins
         LEFT JOIN instalacion i
           ON i.instalador_id = ins.id AND i.fecha >= ${desde}
        WHERE ins.estado = 'activo'
        GROUP BY ins.id, ins.nombre
        ORDER BY completadas DESC
        LIMIT 5`
    ).then(r => r.rows),

    query(
      `SELECT AVG(EXTRACT(EPOCH FROM (i.fecha - c.fecha)) / 3600)::numeric(10,2)
                AS horas_promedio
         FROM cotizacion c
         JOIN instalacion i ON i.cotizacion_id = c.id
        WHERE c.estado = 'aprobada'
          AND i.estado = 'completada'
          AND c.fecha >= ${desde}`
    ).then(r => r.rows[0]?.horas_promedio ?? null),

    query(
      `SELECT p.id, p.modelo, p.ubicacion,
              COUNT(a.id)::int                              AS total,
              COUNT(a.id) FILTER (WHERE a.resuelta)::int    AS resueltas,
              COUNT(a.id) FILTER (WHERE NOT a.resuelta)::int AS pendientes
         FROM plotter p
         LEFT JOIN alerta_iot a
           ON a.plotter_id = p.id AND a.timestamp >= ${desde}
        WHERE p.activo = true
        GROUP BY p.id, p.modelo, p.ubicacion
        ORDER BY total DESC`
    ).then(r => r.rows),

    query(
      `SELECT COALESCE(SUM(total), 0) AS facturado
         FROM cotizacion
        WHERE estado = 'aprobada' AND fecha >= ${desde}`
    ).then(r => r.rows[0]?.facturado ?? 0),
  ]);

  return {
    periodo,
    cotizaciones_por_estado: cotizacionesPorEstado,
    serie_diaria:            serieDiaria,
    top_instaladores:        topInstaladores,
    horas_promedio_instalacion: Number(tiempoPromedioAprobacion) || 0,
    alertas_por_plotter:     alertasPorPlotter,
    total_facturado:         Number(facturacion),
  };
};

module.exports = { getResumenDelDia, getReportes };
