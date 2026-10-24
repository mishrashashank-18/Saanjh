const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const onboardingRoutes = require('./routes/onboardingRoutes');
const userController = require('./controllers/userController');
const { authenticate } = require('./middleware/authMiddleware');
const { getDBStatus } = require('./config/db');
const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// Security HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Allowed origins
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:8443',
  'https://saanjh-vj7v.onrender.com',
  'http://localhost:8443',
  'https://localhost:8443',
  'http://localhost:5173',
  'https://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:8443',
  'https://127.0.0.1:8443',
  'http://127.0.0.1:5173',
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const isAllowed = allowedOrigins.some(
        (allowed) => origin === allowed || origin.replace(/^https?:\/\//, '') === allowed.replace(/^https?:\/\//, '')
      );
      if (isAllowed || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = getDBStatus();
  res.status(200).json({
    status: 'ok',
    service: 'saanjh-backend',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      connected: dbStatus.isConnected,
      state: dbStatus.readyState === 1 ? 'connected' : 'disconnected',
    },
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/onboarding', onboardingRoutes);

// Direct /me endpoints for convenience and explicit spec alignment
app.get('/me/data', authenticate, userController.downloadMyData);
app.delete('/me', authenticate, userController.deleteMyAccount);
app.get('/api/me/data', authenticate, userController.downloadMyData);
app.delete('/api/me', authenticate, userController.deleteMyAccount);

// Centralized 404 handler
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

module.exports = app;
