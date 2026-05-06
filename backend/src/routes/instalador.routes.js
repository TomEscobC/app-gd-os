const router = require('express').Router();
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const instaladorController = require('../controllers/instalador.controller');

router.get('/:id/ruta',
  verifyToken,
  requireRole('instalador', 'admin', 'superadmin'),
  instaladorController.getRuta
);

module.exports = router;
