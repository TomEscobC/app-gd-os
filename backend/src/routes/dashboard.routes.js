const router = require('express').Router();
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const dashboardController = require('../controllers/dashboard.controller');

router.get('/resumen',
  verifyToken,
  requireRole('admin', 'superadmin'),
  dashboardController.getResumen
);

router.get('/reportes',
  verifyToken,
  requireRole('admin', 'superadmin'),
  dashboardController.getReportes
);

module.exports = router;
