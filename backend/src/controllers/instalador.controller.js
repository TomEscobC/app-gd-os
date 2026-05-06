const instaladorService = require('../services/instalador.service');

const getRuta = async (req, res, next) => {
  try {
    const ruta = await instaladorService.getRutaDelDia(req.params.id);
    res.json({ success: true, message: 'Ruta del día obtenida', data: ruta });
  } catch (err) {
    next(err);
  }
};

module.exports = { getRuta };
