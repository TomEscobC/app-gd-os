const iotService = require('../services/iot.service');

const recibirEstado = async (req, res, next) => {
  try {
    const resultado = await iotService.procesarEstado(req.params.id, req.body);
    res.json({ success: true, message: 'Estado del plotter procesado', data: resultado });
  } catch (err) {
    next(err);
  }
};

const resolverAlerta = async (req, res, next) => {
  try {
    const alerta = await iotService.resolverAlerta(req.params.id);
    res.json({ success: true, message: 'Alerta resuelta', data: alerta });
  } catch (err) {
    next(err);
  }
};

const alertasActivas = async (req, res, next) => {
  try {
    const alertas = await iotService.getAlertasActivas();
    res.json({ success: true, message: 'Alertas activas obtenidas', data: alertas });
  } catch (err) { next(err); }
};

// Endpoint público liviano consumido por el simulador IoT para polling.
// No expone datos sensibles, sólo el estado de resolución de la alerta.
const estadoAlerta = async (req, res, next) => {
  try {
    const alerta = await iotService.getEstadoAlerta(req.params.id);
    res.json({ success: true, message: 'Estado obtenido', data: alerta });
  } catch (err) { next(err); }
};

module.exports = { recibirEstado, resolverAlerta, alertasActivas, estadoAlerta };
