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

module.exports = router;
