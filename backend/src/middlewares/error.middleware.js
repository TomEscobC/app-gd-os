const errorHandler = (err, req, res, _next) => {
  console.error('[ERROR]', err.stack);

  const statusCode = err.statusCode || 500;
  const message    = err.message || 'Error interno del servidor';

  res.status(statusCode).json({
    success: false,
    message,
    data: process.env.NODE_ENV === 'development' ? { stack: err.stack } : null,
  });
};

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { errorHandler, AppError };
