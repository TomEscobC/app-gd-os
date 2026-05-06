const dashboardService = require('../services/dashboard.service');

const getResumen = async (req, res, next) => {
  try {
    const resumen = await dashboardService.getResumenDelDia();
    res.json({ success: true, message: 'Resumen del día obtenido', data: resumen });
  } catch (err) {
    next(err);
  }
};

module.exports = { getResumen };
