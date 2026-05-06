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

module.exports = { login };
