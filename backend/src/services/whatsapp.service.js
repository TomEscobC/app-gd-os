const axios = require('axios');

const enviarMensaje = async (telefono, mensaje) => {
  if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_ID) {
    console.warn('[WhatsApp] Credenciales no configuradas — mensaje no enviado');
    return;
  }

  await axios.post(
    `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to:   telefono,
      type: 'text',
      text: { body: mensaje },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );
};

module.exports = { enviarMensaje };
