const { query } = require('../config/database');
const { AppError } = require('../middlewares/error.middleware');

const actualizarEstado = async (id, estado) => {
  const result = await query(
    `UPDATE cotizacion SET estado = $1 WHERE id = $2 RETURNING *`,
    [estado, id]
  );

  if (result.rowCount === 0) throw new AppError('Cotización no encontrada', 404);

  return result.rows[0];
};

const crearCotizacion = async ({ cliente_id, items_detalle, total }) => {
  const result = await query(
    `INSERT INTO cotizacion (cliente_id, fecha, estado, total, items_detalle)
     VALUES ($1, NOW(), 'pendiente', $2, $3)
     RETURNING *`,
    [cliente_id, total, JSON.stringify(items_detalle)]
  );

  return result.rows[0];
};

const getCotizacionById = async (id) => {
  const result = await query(
    `SELECT c.*, cl.nombre AS cliente_nombre, cl.email AS cliente_email
     FROM cotizacion c
     JOIN cliente cl ON c.cliente_id = cl.id
     WHERE c.id = $1`,
    [id]
  );

  if (result.rowCount === 0) throw new AppError('Cotización no encontrada', 404);

  return result.rows[0];
};

const listarCotizaciones = async ({ estado, fecha } = {}) => {
  let where = 'WHERE 1=1';
  const params = [];

  if (estado) {
    params.push(estado);
    where += ` AND c.estado = $${params.length}`;
  }

  if (fecha === 'hoy' || !fecha) {
    where += ` AND DATE(c.fecha) = CURRENT_DATE`;
  } else if (fecha === 'semana') {
    where += ` AND c.fecha >= NOW() - INTERVAL '7 days'`;
  } else if (fecha === 'mes') {
    where += ` AND c.fecha >= NOW() - INTERVAL '30 days'`;
  }

  const result = await query(
    `SELECT c.*, cl.nombre AS cliente_nombre, cl.telefono AS cliente_telefono
     FROM cotizacion c
     JOIN cliente cl ON c.cliente_id = cl.id
     ${where}
     ORDER BY c.fecha DESC`,
    params
  );

  return result.rows;
};

module.exports = { actualizarEstado, crearCotizacion, getCotizacionById, listarCotizaciones };
