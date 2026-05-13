const router = require('express').Router();
const { query } = require('express-validator');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');
const cotizacionController = require('../controllers/cotizacion.controller');

router.get('/',
  verifyToken,
  requireRole('admin', 'superadmin'),
  [
    query('estado').optional().isIn(['pendiente', 'aprobada', 'rechazada']),
    query('fecha').optional().isIn(['hoy', 'semana', 'mes']),
    validate,
  ],
  cotizacionController.listar
);

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
