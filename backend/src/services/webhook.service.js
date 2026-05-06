const { query } = require('../config/database');
const iaService         = require('./ia.service');
const cotizacionService = require('./cotizacion.service');
const whatsappService   = require('./whatsapp.service');

const procesarMensaje = async (body) => {
  const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message) return;

  const from  = message.from;
  const texto = message?.text?.body?.trim() || '';

  if (/cotiz|precio|costo|cuánto|cuanto/i.test(texto)) {
    await procesarSolicitudCotizacion(from, texto);
    return;
  }

  if (/^(aprobar|apruebo|sí|si|yes)$/i.test(texto)) {
    await procesarAprobacion(from);
    return;
  }

  if (/^(rechazar|rechazo|no|cancelar)$/i.test(texto)) {
    await procesarRechazo(from);
    return;
  }

  await whatsappService.enviarMensaje(
    from,
    'Hola, soy el asistente de *Global Design*. Puedo ayudarte con cotizaciones de ' +
    'letreros, vinilos y banners. ¿En qué te puedo ayudar?'
  );
};

const procesarSolicitudCotizacion = async (telefono, texto) => {
  const cliente = await buscarOCrearCliente(telefono);
  const cotizacion = await iaService.generarCotizacion(texto);

  const nueva = await cotizacionService.crearCotizacion({
    cliente_id:    cliente.id,
    items_detalle: cotizacion.items,
    total:         cotizacion.total,
  });

  await whatsappService.enviarMensaje(telefono, buildMensajeCotizacion(cotizacion, nueva.id));
};

const procesarAprobacion = async (telefono) => {
  const result = await query(
    `SELECT c.id FROM cotizacion c
     JOIN cliente cl ON c.cliente_id = cl.id
     WHERE cl.telefono = $1 AND c.estado = 'pendiente'
     ORDER BY c.fecha DESC LIMIT 1`,
    [telefono]
  );

  if (result.rowCount === 0) {
    await whatsappService.enviarMensaje(telefono, 'No tienes cotizaciones pendientes de aprobación.');
    return;
  }

  await cotizacionService.actualizarEstado(result.rows[0].id, 'aprobada');
  await whatsappService.enviarMensaje(
    telefono,
    '¡Excelente! Tu cotización ha sido *aprobada*. Nos pondremos en contacto contigo pronto.'
  );
};

const procesarRechazo = async (telefono) => {
  const result = await query(
    `SELECT c.id FROM cotizacion c
     JOIN cliente cl ON c.cliente_id = cl.id
     WHERE cl.telefono = $1 AND c.estado = 'pendiente'
     ORDER BY c.fecha DESC LIMIT 1`,
    [telefono]
  );

  if (result.rowCount === 0) {
    await whatsappService.enviarMensaje(telefono, 'No tienes cotizaciones pendientes de aprobación.');
    return;
  }

  await cotizacionService.actualizarEstado(result.rows[0].id, 'rechazada');
  await whatsappService.enviarMensaje(
    telefono,
    'Entendido, cotización rechazada. Si cambias de opinión, escríbenos de nuevo.'
  );
};

const buscarOCrearCliente = async (telefono) => {
  const existente = await query('SELECT * FROM cliente WHERE telefono = $1', [telefono]);
  if (existente.rowCount > 0) return existente.rows[0];

  const nuevo = await query(
    'INSERT INTO cliente (nombre, telefono, fecha_registro) VALUES ($1, $2, NOW()) RETURNING *',
    [`Cliente WA ${telefono}`, telefono]
  );
  return nuevo.rows[0];
};

const buildMensajeCotizacion = (cotizacion, id) => {
  let msg = `📋 *Cotización #${id}*\n\n`;
  for (const item of cotizacion.items) {
    msg += `• ${item.descripcion}: $${Number(item.precio).toLocaleString('es-CL')}\n`;
  }
  msg += `\n💰 *Total: $${Number(cotizacion.total).toLocaleString('es-CL')}*\n\n`;
  msg += 'Responde *APROBAR* para confirmar o *RECHAZAR* para cancelar.';
  return msg;
};

module.exports = { procesarMensaje };
