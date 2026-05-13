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

const savePushToken = async (req, res, next) => {
  try {
    const { push_token } = req.body;
    await authService.savePushToken(req.user.id, req.user.rol, push_token);
    res.json({ success: true, message: 'Push token guardado', data: null });
  } catch (err) { next(err); }
};

module.exports = { login, savePushToken };
