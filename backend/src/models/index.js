/**
 * Capa de modelos — APP-GD-OS
 *
 * Los modelos utilizan SQL raw a través del pool de pg.
 * Cada servicio importa { query } desde config/database directamente.
 * Este archivo re-exporta el query helper para quienes prefieran
 * importar desde una sola ubicación.
 */
const { query, pool } = require('../config/database');

module.exports = { query, pool };
