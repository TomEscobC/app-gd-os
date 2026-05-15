/**
 * Simulador IoT de plotters — APP-GD-OS
 * ------------------------------------------------------------------
 * Emula el comportamiento de uno o varios plotters físicos enviando
 * telemetría periódica al backend. Útil para demostraciones en vivo
 * del flujo de alertas IoT sin necesidad de hardware real.
 *
 * Uso:
 *   node src/scripts/plotter-simulator.js
 *   node src/scripts/plotter-simulator.js --plotters=1,2,3 --interval=30
 *
 * Variables de entorno:
 *   API_URL         URL del backend (default: http://localhost:3000)
 *   PLOTTER_IDS     IDs a simular separados por coma (default: 1,2,3)
 *   INTERVAL_SEG    Intervalo entre envíos en segundos (default: 30)
 *   ATASCO_PROB     Probabilidad de atasco por iteración (default: 0.10)
 * ------------------------------------------------------------------
 */
require('dotenv').config();
const axios = require('axios');

// ── Configuración ──────────────────────────────────────────────────
const API_URL     = process.env.API_URL || 'http://localhost:3000';
const INTERVALO   = parseInt(process.env.INTERVAL_SEG || '30', 10) * 1000;
const ATASCO_PROB = parseFloat(process.env.ATASCO_PROB || '0.10');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v];
  })
);

const PLOTTER_IDS = (args.plotters || process.env.PLOTTER_IDS || '1,2,3')
  .split(',')
  .map((x) => parseInt(x.trim(), 10))
  .filter((n) => !isNaN(n));

// ── Estado en memoria por plotter ─────────────────────────────────
const estado = {};
PLOTTER_IDS.forEach((id) => {
  estado[id] = {
    porcentaje_avance: 0,
    nivel_tinta:       Math.floor(70 + Math.random() * 30), // 70-100
    cola_trabajos:     Math.floor(Math.random() * 5),
    tiene_atasco:      false,
    alerta_id_activa:  null,
    esperando_resolucion: false,
  };
});

// ── Helpers de logging ────────────────────────────────────────────
const log = (id, msg, color = '\x1b[36m') => {
  const ts = new Date().toLocaleTimeString('es-CL');
  console.log(`${color}[${ts}] Plotter #${id}\x1b[0m ${msg}`);
};

// ── Generador de payload ──────────────────────────────────────────
const generarPayload = (id) => {
  const s = estado[id];

  // Si está esperando resolución de atasco, mantiene el estado
  if (s.esperando_resolucion) {
    return {
      tipo: 'atasco',
      descripcion: `Atasco detectado en plotter #${id}. Esperando intervención.`,
      porcentaje_avance: s.porcentaje_avance,
      tiene_atasco: true,
      nivel_tinta: s.nivel_tinta,
      cola_trabajos: s.cola_trabajos,
    };
  }

  // Avance gradual (5-15% por iteración)
  s.porcentaje_avance = Math.min(100, s.porcentaje_avance + Math.random() * 10 + 5);
  if (s.porcentaje_avance >= 100) s.porcentaje_avance = 0; // reinicia ciclo

  // Decremento de tinta (0.5-2% por iteración)
  s.nivel_tinta = Math.max(0, s.nivel_tinta - (Math.random() * 1.5 + 0.5));

  // Cola de trabajos varía ligeramente
  s.cola_trabajos = Math.max(0, s.cola_trabajos + (Math.random() > 0.5 ? 1 : -1));

  // Posible atasco aleatorio
  const atasco = Math.random() < ATASCO_PROB;
  if (atasco) {
    s.tiene_atasco = true;
    s.esperando_resolucion = true;
  }

  // Posible alerta por tinta baja
  const tintaBaja = s.nivel_tinta < 15;

  let tipo = 'estado_normal';
  let descripcion = `Imprimiendo: ${s.porcentaje_avance.toFixed(1)}% — Tinta: ${s.nivel_tinta.toFixed(0)}%`;

  if (atasco) {
    tipo = 'atasco';
    descripcion = `🔴 ATASCO detectado en plotter #${id}`;
  } else if (tintaBaja) {
    tipo = 'tinta_baja';
    descripcion = `🟡 Nivel de tinta crítico: ${s.nivel_tinta.toFixed(0)}%`;
  }

  return {
    tipo,
    descripcion,
    porcentaje_avance: Number(s.porcentaje_avance.toFixed(1)),
    tiene_atasco: s.tiene_atasco,
    nivel_tinta:  Number(s.nivel_tinta.toFixed(1)),
    cola_trabajos: s.cola_trabajos,
  };
};

// ── Envío al backend ──────────────────────────────────────────────
const enviarEstado = async (id) => {
  const payload = generarPayload(id);
  try {
    const { data } = await axios.post(
      `${API_URL}/iot/plotter/${id}/estado`,
      payload,
      { timeout: 10000 }
    );

    if (data.data?.alerta_generada) {
      const alertaId = data.data.alerta?.id;
      estado[id].alerta_id_activa = alertaId;
      log(id, `\x1b[31m⚠ ALERTA #${alertaId}\x1b[0m ${payload.descripcion}`, '\x1b[33m');

      if (payload.tipo === 'atasco') {
        log(id, `Esperando resolución manual de la alerta #${alertaId}...`, '\x1b[35m');
        // Polling: revisa si la alerta fue resuelta
        verificarResolucion(id, alertaId);
      }
    } else {
      log(id, payload.descripcion);
    }
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    log(id, `\x1b[31m✗ Error: ${msg}\x1b[0m`, '\x1b[31m');
  }
};

// ── Verificación de resolución (polling cada 5s) ──────────────────
const verificarResolucion = (id, alertaId) => {
  const poll = setInterval(async () => {
    try {
      // Consulta directa con auth opcional: si el endpoint público no existe,
      // confiamos en el siguiente ciclo de heartbeat para detectar el cambio.
      const { data } = await axios.get(
        `${API_URL}/iot/alerta/${alertaId}/estado`,
        { timeout: 5000, validateStatus: () => true }
      );
      if (data?.data?.resuelta === true) {
        clearInterval(poll);
        estado[id].esperando_resolucion = false;
        estado[id].tiene_atasco = false;
        estado[id].alerta_id_activa = null;
        log(id, `\x1b[32m✓ Alerta #${alertaId} resuelta. Reanudando operación.\x1b[0m`, '\x1b[32m');
      }
    } catch {}
  }, 5000);

  // Timeout de seguridad: tras 10 min libera el plotter
  setTimeout(() => {
    clearInterval(poll);
    if (estado[id].esperando_resolucion) {
      estado[id].esperando_resolucion = false;
      estado[id].tiene_atasco = false;
      log(id, '\x1b[33m⏱ Timeout — reanudando sin resolución manual\x1b[0m', '\x1b[33m');
    }
  }, 10 * 60 * 1000);
};

// ── Bootstrap ─────────────────────────────────────────────────────
console.log('\n\x1b[1m╔════════════════════════════════════════════════════╗');
console.log('║     APP-GD-OS — Simulador IoT de Plotters         ║');
console.log('╚════════════════════════════════════════════════════╝\x1b[0m');
console.log(`  Backend:    ${API_URL}`);
console.log(`  Plotters:   ${PLOTTER_IDS.join(', ')}`);
console.log(`  Intervalo:  ${INTERVALO / 1000}s`);
console.log(`  P(atasco):  ${(ATASCO_PROB * 100).toFixed(0)}%`);
console.log('  ──────────────────────────────────────────────────\n');

// Primer envío inmediato + intervalos
PLOTTER_IDS.forEach((id) => {
  enviarEstado(id);
  setInterval(() => enviarEstado(id), INTERVALO + Math.random() * 3000);
});

process.on('SIGINT', () => {
  console.log('\n\x1b[33m▶ Simulador detenido por el usuario.\x1b[0m\n');
  process.exit(0);
});
