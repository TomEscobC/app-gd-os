const router = require('express').Router();
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const cotizacionController = require('../controllers/cotizacion.controller');

router.post('/:id/aprobar',
  verifyToken,
  requireRole('admin', 'superadmin'),
  cotizacionController.aprobar
);

router.post('/:id/rechazar',
  verifyToken,
  requireRole('admin', 'superadmin'),
  cotizacionController.rechazar
);

module.exports = router;
