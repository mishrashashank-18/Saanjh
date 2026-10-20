const path = require('path');
// Explicitly resolve and load the backend .env file
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = require('./app');
const { connectDB } = require('./config/db');
const mongoose = require('mongoose');

const PORT = process.env.PORT || 5000;

async function startServer() {
  // Connect to MongoDB
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`
=====================================================
  ✨ Saanjh Backend API Server is Live!
  📡 Port: http://localhost:${PORT}
  🌍 Environment: ${process.env.NODE_ENV || 'development'}
  🏥 Health check: http://localhost:${PORT}/api/health
  🔒 Auth endpoints: http://localhost:${PORT}/api/auth
  👤 User endpoints: http://localhost:${PORT}/api/users
=====================================================
    `);
  });

  // Graceful shutdown handling
  const shutdown = async (signal) => {
    console.log(`\n[Saanjh Backend] Received ${signal}. Gracefully shutting down...`);
    server.close(async () => {
      console.log('[Saanjh Backend] HTTP server closed.');
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close(false);
        console.log('[Saanjh Backend] MongoDB connection closed.');
      }
      process.exit(0);
    });

    // Force shutdown after timeout if pending requests hang
    setTimeout(() => {
      console.error('[Saanjh Backend] Forcefully shutting down after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('[Saanjh Backend] Fatal error during startup:', err);
  process.exit(1);
});
