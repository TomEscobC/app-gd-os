const { query } = require('../config/database');

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

module.exports = { getResumenDelDia };
