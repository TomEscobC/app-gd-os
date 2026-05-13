require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');

const limiterGeneral = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas solicitudes, intenta en 15 minutos', data: null },
});

const limiterAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Demasiados intentos de login, intenta en 15 minutos', data: null },
});

const authRoutes       = require('./src/routes/auth.routes');
const webhookRoutes    = require('./src/routes/webhook.routes');
const cotizacionRoutes = require('./src/routes/cotizacion.routes');
const instaladorRoutes = require('./src/routes/instalador.routes');
const instalacionRoutes = require('./src/routes/instalacion.routes');
const iotRoutes        = require('./src/routes/iot.routes');
const dashboardRoutes  = require('./src/routes/dashboard.routes');
const { errorHandler } = require('./src/middlewares/error.middleware');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(limiterGeneral);

app.use('/auth',       limiterAuth, authRoutes);
app.use('/webhook',    webhookRoutes);
app.use('/cotizacion', cotizacionRoutes);
app.use('/instalador', instaladorRoutes);
app.use('/instalacion', instalacionRoutes);
app.use('/iot',        iotRoutes);
app.use('/dashboard',  dashboardRoutes);

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'API operativa', data: { timestamp: new Date() } });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[APP-GD-OS] Servidor corriendo en el puerto ${PORT}`);
});

module.exports = app;
