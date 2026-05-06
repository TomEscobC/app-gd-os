const cotizacionService = require('../services/cotizacion.service');

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

module.exports = { aprobar, rechazar };
