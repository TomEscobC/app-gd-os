const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middlewares/validate.middleware');
const authController = require('../controllers/auth.controller');

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Contraseña requerida'),
    body('tipo')
      .isIn(['admin', 'instalador'])
      .withMessage("Tipo debe ser 'admin' o 'instalador'"),
    validate,
  ],
  authController.login
);

router.post(
  '/push-token',
  [
    require('../middlewares/auth.middleware').verifyToken,
    body('push_token').notEmpty().withMessage('push_token requerido'),
    validate,
  ],
  authController.savePushToken
);

module.exports = router;
