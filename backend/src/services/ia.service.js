const axios = require('axios');

const SYSTEM_PROMPT = `Eres un asistente de cotización para una empresa de publicidad que fabrica
letreros, vinilos y banners.
Dado un mensaje de cliente, extrae los productos solicitados y genera una cotización en JSON.
Precios base por m²: letrero LED = 85000 CLP, vinilo = 12000 CLP, banner = 8000 CLP.
Responde SOLO con JSON válido con esta estructura exacta:
{ "items": [{ "descripcion": "...", "cantidad": 1, "precio": 0 }], "total": 0 }`;

const generarCotizacion = async (descripcion) => {
  if (!process.env.OPENAI_API_KEY) {
    return cotizacionFallback(descripcion);
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: descripcion },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return JSON.parse(response.data.choices[0].message.content);
  } catch (err) {
    console.error('[IA] Error al generar cotización:', err.message);
    return cotizacionFallback(descripcion);
  }
};

// Cotización por defecto cuando la API de IA no está disponible
const cotizacionFallback = (descripcion) => ({
  items: [{
    descripcion: `Trabajo solicitado: ${descripcion.substring(0, 60)}`,
    cantidad: 1,
    precio: 50000,
  }],
  total: 50000,
});

module.exports = { generarCotizacion };
