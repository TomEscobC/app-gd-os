const dashboardService = require('../services/dashboard.service');

const getResumen = async (req, res, next) => {
  try {
    const resumen = await dashboardService.getResumenDelDia();
    res.json({ success: true, message: 'Resumen del día obtenido', data: resumen });
  } catch (err) {
    next(err);
  }
};

const getReportes = async (req, res, next) => {
  try {
    const periodo = (req.query.periodo || 'hoy').toString().toLowerCase();
    const reporte = await dashboardService.getReportes(periodo);
    res.json({ success: true, message: 'Reporte generado', data: reporte });
  } catch (err) {
    next(err);
  }
};

module.exports = { getResumen, getReportes };
