const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { query } = require('../config/database');
const { AppError } = require('../middlewares/error.middleware');

const login = async (email, password, tipo) => {
  let user;

  if (tipo === 'instalador') {
    const result = await query(
      `SELECT id, nombre, email, password_hash, 'instalador' AS rol
       FROM instalador
       WHERE email = $1 AND estado = 'activo'`,
      [email]
    );
    user = result.rows[0];
  } else {
    const result = await query(
      `SELECT id, nombre, email, password_hash, rol
       FROM usuario_admin
       WHERE email = $1`,
      [email]
    );
    user = result.rows[0];
  }

  if (!user) throw new AppError('Credenciales inválidas', 401);

  const esValido = await bcrypt.compare(password, user.password_hash);
  if (!esValido) throw new AppError('Credenciales inválidas', 401);

  const token = jwt.sign(
    { id: user.id, email: user.email, rol: user.rol, nombre: user.nombre },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  return {
    token,
    usuario: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
  };
};

const savePushToken = async (userId, rol, pushToken) => {
  const tabla = rol === 'instalador' ? 'instalador' : 'usuario_admin';
  await query(`UPDATE ${tabla} SET push_token = $1 WHERE id = $2`, [pushToken, userId]);
};

// ── Reset de credenciales demo ────────────────────────────────────
// Genera contraseñas aleatorias para las cuentas demo y retorna las nuevas.
// Sólo accesible si el header `x-admin-secret` coincide con ADMIN_SECRET.
const CUENTAS_DEMO = [
  { tabla: 'usuario_admin', email: 'admin@globaldesign.cl'   },
  { tabla: 'usuario_admin', email: 'matias@globaldesign.cl'  },
  { tabla: 'instalador',    email: 'roberto@globaldesign.cl' },
  { tabla: 'instalador',    email: 'diego@globaldesign.cl'   },
];

const generarPassword = (len = 14) => {
  // Charset legible (sin caracteres ambiguos l/I/1/0/O)
  const charset = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
  return Array.from({ length: len },
    () => charset[Math.floor(Math.random() * charset.length)]
  ).join('');
};

const resetCredencialesDemo = async (adminSecret) => {
  if (!process.env.ADMIN_SECRET) {
    throw new AppError('ADMIN_SECRET no configurado en el servidor', 500);
  }
  if (adminSecret !== process.env.ADMIN_SECRET) {
    throw new AppError('Secret inválido', 403);
  }

  const resultados = [];
  for (const { tabla, email } of CUENTAS_DEMO) {
    const nuevaPassword = generarPassword();
    const hash = await bcrypt.hash(nuevaPassword, 12);

    const r = await query(
      `UPDATE ${tabla} SET password_hash = $1 WHERE email = $2 RETURNING email, nombre`,
      [hash, email]
    );

    if (r.rowCount > 0) {
      resultados.push({
        tabla,
        email,
        nombre: r.rows[0].nombre,
        password_nueva: nuevaPassword,
      });
    }
  }

  return {
    rotadas: resultados.length,
    cuentas: resultados,
    advertencia: 'Guarda estas contraseñas ahora. No volverán a mostrarse.',
  };
};

module.exports = { login, savePushToken, resetCredencialesDemo };
