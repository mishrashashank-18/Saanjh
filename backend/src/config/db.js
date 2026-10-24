const mongoose = require('mongoose');

let isConnected = false;
let memoryServerInstance = null;

async function connectDB() {
  let uri = process.env.MONGODB_URI;

  // In development, if MONGODB_URI is not provided or explicitly 'memory', spin up MongoMemoryServer
  if (!uri || uri.trim() === '' || uri === 'memory') {
    if (process.env.NODE_ENV !== 'production') {
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        if (!memoryServerInstance) {
          memoryServerInstance = await MongoMemoryServer.create();
        }
        uri = memoryServerInstance.getUri();
        console.log(`[Saanjh Backend] Starting in-memory MongoDB instance for development at: ${uri}`);
      } catch (err) {
        console.error(`[Saanjh Backend] Failed to start in-memory MongoDB: ${err.message}`);
        return null;
      }
    } else {
      console.error(
        '\n[Saanjh Backend Error] MONGODB_URI is not defined in backend/.env.\n' +
        'Database connection refused. Server cannot start without a valid MongoDB URI in production.\n'
      );
      process.exit(1);
    }
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true,
    });

    isConnected = true;
    console.log(`[Saanjh Backend] MongoDB connected successfully: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`\n[Saanjh Backend Error] Could not connect to MongoDB at: ${uri}`);
    console.error(`Details: ${error.message}\n`);

    // In development, if connecting to localhost failed, fallback to in-memory server
    if (process.env.NODE_ENV !== 'production' && !memoryServerInstance) {
      try {
        console.log('[Saanjh Backend] Falling back to in-memory MongoDB for local development session...');
        const { MongoMemoryServer } = require('mongodb-memory-server');
        memoryServerInstance = await MongoMemoryServer.create();
        const memUri = memoryServerInstance.getUri();
        const conn = await mongoose.connect(memUri);
        isConnected = true;
        console.log(`[Saanjh Backend] MongoDB fallback connected successfully.`);
        return conn;
      } catch (memErr) {
        console.error(`[Saanjh Backend] Fallback in-memory MongoDB failed: ${memErr.message}`);
      }
    }

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
    readyState: mongoose.connection.readyState,
  };
}

module.exports = {
  connectDB,
  getDBStatus,
};
