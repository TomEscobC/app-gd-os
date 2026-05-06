const router = require('express').Router();
const webhookController = require('../controllers/webhook.controller');

// GET: verificación inicial del webhook por Meta
router.get('/whatsapp', webhookController.verify);

// POST: recepción de mensajes entrantes
router.post('/whatsapp', webhookController.receive);

module.exports = router;
