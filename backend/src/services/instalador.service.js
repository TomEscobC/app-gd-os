const { query } = require('../config/database');

const getRutaDelDia = async (instaladorId) => {
  const result = await query(
    `SELECT
       i.id,
       i.fecha,
       i.estado,
       i.latitud,
       i.longitud,
       c.id            AS cotizacion_id,
       c.items_detalle,
       c.total,
       cl.nombre       AS cliente_nombre,
       cl.telefono     AS cliente_telefono
     FROM instalacion i
     JOIN cotizacion c  ON i.cotizacion_id = c.id
     JOIN cliente    cl ON c.cliente_id    = cl.id
     WHERE i.instalador_id = $1
       AND DATE(i.fecha) = CURRENT_DATE
     ORDER BY i.fecha ASC`,
    [instaladorId]
  );

  return result.rows;
};

module.exports = { getRutaDelDia };
