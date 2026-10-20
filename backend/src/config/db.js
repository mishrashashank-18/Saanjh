const mongoose = require('mongoose');

let isConnected = false;

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.trim() === '') {
    console.warn(
      '\n[Saanjh Backend] Warning: MONGODB_URI is not defined in backend/.env.\n' +
      'Database operations will fail until a valid MongoDB connection string is provided.\n' +
      'Follow the setup instructions to create a MongoDB Atlas cluster and set MONGODB_URI in backend/.env.\n'
    );
    return null;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      autoIndex: process.env.NODE_ENV !== 'production',
    });

    isConnected = true;
    console.log(`[Saanjh Backend] MongoDB connected successfully to host: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[Saanjh Backend] MongoDB connection error: ${error.message}`);
    // Do not crash the entire process immediately in development so health check and other services can respond
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    return null;
  }
}

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('[Saanjh Backend] MongoDB disconnected.');
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  console.log('[Saanjh Backend] MongoDB reconnected.');
});

function getDBStatus() {
  return {
    isConnected: mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState, // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  };
}

module.exports = {
  connectDB,
  getDBStatus,
};
