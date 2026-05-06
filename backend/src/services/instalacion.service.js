const { query } = require('../config/database');
const { AppError } = require('../middlewares/error.middleware');

const completarInstalacion = async (id, { latitud, longitud, foto_evidencia_url }) => {
  const existente = await query('SELECT * FROM instalacion WHERE id = $1', [id]);

  if (existente.rowCount === 0) throw new AppError('Instalación no encontrada', 404);

  if (existente.rows[0].estado === 'completada') {
    throw new AppError('La instalación ya fue completada', 400);
  }

  const result = await query(
    `UPDATE instalacion
     SET estado             = 'completada',
         foto_evidencia_url = $1,
         latitud            = $2,
         longitud           = $3,
         fecha              = NOW()
     WHERE id = $4
     RETURNING *`,
    [foto_evidencia_url, latitud, longitud, id]
  );

  return result.rows[0];
};

module.exports = { completarInstalacion };
