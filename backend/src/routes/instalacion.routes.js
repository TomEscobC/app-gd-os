const router = require('express').Router();
const { body } = require('express-validator');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { upload } = require('../config/cloudinary');
const instalacionController = require('../controllers/instalacion.controller');

router.post('/:id/completar',
  verifyToken,
  requireRole('instalador', 'admin', 'superadmin'),
  upload.single('foto'),
  [
    body('latitud')
      .notEmpty().withMessage('Latitud requerida')
      .isFloat({ min: -90, max: 90 }).withMessage('Latitud inválida'),
    body('longitud')
      .notEmpty().withMessage('Longitud requerida')
      .isFloat({ min: -180, max: 180 }).withMessage('Longitud inválida'),
    validate,
  ],
  instalacionController.completar
);

module.exports = router;
