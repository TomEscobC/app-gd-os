const authService = require('../services/auth.service');

const login = async (req, res, next) => {
  try {
    const { email, password, tipo } = req.body;
    const result = await authService.login(email, password, tipo);
    res.json({ success: true, message: 'Login exitoso', data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = { login };
