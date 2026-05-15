const { query } = require('../config/database');
const { AppError } = require('../middlewares/error.middleware');
const pdfService = require('./pdf.service');

/**
 * Completa una instalación:
 *   1. Persiste foto, GPS, firma y marca como 'completada'
 *   2. Genera el Acta de Instalación en PDF (con foto + firma embebidas)
 *   3. Sube el PDF a Cloudinary y guarda la URL en pdf_acta_url
 *   4. Retorna la instalación completa enriquecida
 *
 * La generación del PDF se ejecuta en línea para que el cliente reciba
 * la URL en la misma respuesta. Si falla, no rompe la operación: la
 * instalación queda completada y el PDF puede regenerarse luego.
 */
const completarInstalacion = async (id, {
  latitud, longitud, foto_evidencia_url, firma_base64,
}) => {
  const existente = await query(
    `SELECT i.*, c.cliente_id, c.total AS cotizacion_total, c.estado AS cotizacion_estado
       FROM instalacion i
       LEFT JOIN cotizacion c ON c.id = i.cotizacion_id
      WHERE i.id = $1`,
    [id]
  );

  if (existente.rowCount === 0) throw new AppError('Instalación no encontrada', 404);
  if (existente.rows[0].estado === 'completada') {
    throw new AppError('La instalación ya fue completada', 400);
  }

  // 1. Actualiza la instalación con foto, coords y firma
  const actualizada = await query(
    `UPDATE instalacion
        SET estado             = 'completada',
            foto_evidencia_url = COALESCE($1, foto_evidencia_url),
            latitud            = $2,
            longitud           = $3,
            firma_cliente      = COALESCE($4, firma_cliente),
            fecha              = NOW()
      WHERE id = $5
      RETURNING *`,
    [foto_evidencia_url, latitud, longitud, firma_base64 || null, id]
  );

  const instalacion = actualizada.rows[0];

  // 2. Carga datos relacionados para el PDF
  const [cliente, cotizacion, instalador, correlativo] = await Promise.all([
    query(`SELECT c.* FROM cliente c
             JOIN cotizacion co ON co.cliente_id = c.id
            WHERE co.id = $1`, [instalacion.cotizacion_id]).then(r => r.rows[0]),
    query('SELECT * FROM cotizacion WHERE id = $1', [instalacion.cotizacion_id]).then(r => r.rows[0]),
    query('SELECT * FROM instalador WHERE id = $1', [instalacion.instalador_id]).then(r => r.rows[0]),
    query("SELECT COUNT(*)::int + 1 AS n FROM instalacion WHERE estado = 'completada' AND id <= $1", [id])
      .then(r => r.rows[0].n),
  ]);

  // 3. Genera y sube el PDF — best-effort, no bloqueante en caso de error
  let pdf_acta_url = null;
  try {
    pdf_acta_url = await pdfService.generarActaInstalacion({
      instalacion,
      cliente,
      cotizacion,
      instalador,
      foto_url: instalacion.foto_evidencia_url,
      firma_base64: firma_base64 || instalacion.firma_cliente,
      numero_acta: correlativo,
    });

    await query(
      'UPDATE instalacion SET pdf_acta_url = $1 WHERE id = $2',
      [pdf_acta_url, id]
    );
  } catch (err) {
    console.error('[Instalacion] Error generando acta PDF:', err.message);
  }

  return {
    ...instalacion,
    pdf_acta_url,
    numero_acta: correlativo,
  };
};

module.exports = { completarInstalacion };
