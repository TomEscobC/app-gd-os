const webhookService = require('../services/webhook.service');

const verify = (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  res.sendStatus(403);
};

const receive = async (req, res, next) => {
  try {
    await webhookService.procesarMensaje(req.body);
    res.sendStatus(200);
  } catch (err) {
    next(err);
  }
};

module.exports = { verify, receive };
