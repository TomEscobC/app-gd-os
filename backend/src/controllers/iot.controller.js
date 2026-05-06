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

module.exports = { recibirEstado, resolverAlerta };
