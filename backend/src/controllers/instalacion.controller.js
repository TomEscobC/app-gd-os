const instalacionService = require('../services/instalacion.service');

const completar = async (req, res, next) => {
  try {
    const { latitud, longitud } = req.body;
    const foto_evidencia_url = req.file ? req.file.path : null;

    const instalacion = await instalacionService.completarInstalacion(req.params.id, {
      latitud,
      longitud,
      foto_evidencia_url,
    });

    res.json({ success: true, message: 'Instalación completada', data: instalacion });
  } catch (err) {
    next(err);
  }
};

module.exports = { completar };
