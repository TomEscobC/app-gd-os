const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middlewares/validate.middleware');
const iotController = require('../controllers/iot.controller');

router.post('/plotter/:id/estado',
  [
    body('tipo').optional().isString().trim(),
    body('descripcion').optional().isString().trim(),
    body('porcentaje_avance')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('porcentaje_avance debe ser entre 0 y 100'),
    body('tiene_atasco')
      .optional()
      .isBoolean()
      .withMessage('tiene_atasco debe ser booleano'),
    validate,
  ],
  iotController.recibirEstado
);

router.get('/alertas/activas',
  require('../middlewares/auth.middleware').verifyToken,
  require('../middlewares/role.middleware').requireRole('admin', 'superadmin'),
  iotController.alertasActivas
);

router.post('/alerta/:id/resolver',
  require('../middlewares/auth.middleware').verifyToken,
  require('../middlewares/role.middleware').requireRole('admin', 'superadmin'),
  iotController.resolverAlerta
);

module.exports = router;
