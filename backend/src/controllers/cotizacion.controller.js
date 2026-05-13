const cotizacionService = require('../services/cotizacion.service');

const listar = async (req, res, next) => {
  try {
    const { estado, fecha } = req.query;
    const cotizaciones = await cotizacionService.listarCotizaciones({ estado, fecha });
    res.json({ success: true, message: 'Cotizaciones obtenidas', data: cotizaciones });
  } catch (err) { next(err); }
};

const aprobar = async (req, res, next) => {
  try {
    const cotizacion = await cotizacionService.actualizarEstado(req.params.id, 'aprobada');
    res.json({ success: true, message: 'Cotización aprobada', data: cotizacion });
  } catch (err) {
    next(err);
  }
};

const rechazar = async (req, res, next) => {
  try {
    const cotizacion = await cotizacionService.actualizarEstado(req.params.id, 'rechazada');
    res.json({ success: true, message: 'Cotización rechazada', data: cotizacion });
  } catch (err) {
    next(err);
  }
};

module.exports = { listar, aprobar, rechazar };
