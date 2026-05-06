const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'No autenticado', data: null });
    }

    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: `Acceso denegado. Se requiere rol: ${roles.join(' o ')}`,
        data: null,
      });
    }

    next();
  };
};

module.exports = { requireRole };
