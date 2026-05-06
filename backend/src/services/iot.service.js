const { query } = require('../config/database');
const { AppError } = require('../middlewares/error.middleware');
const whatsappService = require('./whatsapp.service');

const procesarEstado = async (plotterId, payload) => {
  const plotter = await query(
    'SELECT * FROM plotter WHERE id = $1 AND activo = true',
    [plotterId]
  );

  if (plotter.rowCount === 0) throw new AppError('Plotter no encontrado o inactivo', 404);

  const tipoAlerta = detectarTipoAlerta(payload);
  let alerta = null;

  if (tipoAlerta) {
    const resultado = await query(
      `INSERT INTO alerta_iot
         (plotter_id, tipo, descripcion, porcentaje_avance, tiene_atasco, timestamp, resuelta)
       VALUES ($1, $2, $3, $4, $5, NOW(), false)
       RETURNING *`,
      [
        plotterId,
        tipoAlerta,
        payload.descripcion || `Alerta automática: ${tipoAlerta}`,
        payload.porcentaje_avance ?? null,
        payload.tiene_atasco ?? false,
      ]
    );

    alerta = resultado.rows[0];
    await notificarAdmins(plotter.rows[0], alerta);
  }

  return { plotter_id: plotterId, alerta_generada: !!alerta, alerta };
};

// Determina si el payload genera una alerta y de qué tipo
const detectarTipoAlerta = ({ tiene_atasco, porcentaje_avance, tipo }) => {
  if (tiene_atasco === true)                              return 'atasco';
  if (porcentaje_avance !== undefined && porcentaje_avance < 10) return 'tinta_baja';
  if (tipo)                                               return tipo;
  return null;
};

const notificarAdmins = async (plotter, alerta) => {
  try {
    const admins = await query(
      `SELECT * FROM usuario_admin WHERE rol IN ('admin', 'superadmin') AND telefono IS NOT NULL`
    );

    const mensaje = buildMensajeAlerta(plotter, alerta);

    for (const admin of admins.rows) {
      await whatsappService.enviarMensaje(admin.telefono, mensaje);
    }
  } catch (err) {
    console.error('[IoT] Error notificando admins:', err.message);
  }
};

const buildMensajeAlerta = (plotter, alerta) => {
  const iconos = { atasco: '🔴', tinta_baja: '🟡' };
  const icono  = iconos[alerta.tipo] || '⚠️';

  return (
    `${icono} *Alerta IoT — ${plotter.modelo}*\n` +
    `📍 ${plotter.ubicacion}\n` +
    `🔧 Tipo: ${alerta.tipo}\n` +
    `📝 ${alerta.descripcion}\n` +
    `🕐 ${new Date(alerta.timestamp).toLocaleString('es-CL')}`
  );
};

const resolverAlerta = async (alertaId) => {
  const result = await query(
    'UPDATE alerta_iot SET resuelta = true WHERE id = $1 RETURNING *',
    [alertaId]
  );

  if (result.rowCount === 0) throw new AppError('Alerta no encontrada', 404);

  return result.rows[0];
};

module.exports = { procesarEstado, resolverAlerta };
