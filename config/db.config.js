const mongoose = require('mongoose');
const logger = require('../api/utils/logger');
const { setTimeout } = require('timers/promises');

// Enhanced DB configuration
exports.connect = async (callback) => {
  const MONGO_URI = process.env.MONGO_URI || process.env.DB_URI; // Support both common env var names
  
  if (!MONGO_URI) {
    const error = new Error('MongoDB connection string not configured');
    logger.error(error.message, { stack: error.stack });
    process.exit(1);
  }

  // Enhanced connection options
  const options = {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    maxPoolSize: process.env.NODE_ENV === 'production' ? 50 : 10,
    minPoolSize: 5,
    socketTimeoutMS: 45000,
    retryWrites: true,
    retryReads: true,
    heartbeatFrequencyMS: 30000, // Send heartbeat every 30 seconds
    appName: 'madhav-couriers', // Identify application in MongoDB logs
    compressors: ['snappy', 'zlib'], // Enable compression
    zlibCompressionLevel: 6, // Optimal compression level
    autoIndex: process.env.NODE_ENV !== 'production' // Disable in prod for performance
  };

  // Connection retry logic
  const maxRetries = 3;
  let retryCount = 0;
  let lastError = null;

  while (retryCount < maxRetries) {
    try {
      await mongoose.connect(MONGO_URI, options);
      
      mongoose.connection.on('connected', () => {
        logger.info(`MongoDB connected to ${mongoose.connection.host}`, {
          dbName: mongoose.connection.name,
          mongoVersion: mongoose.version
        });
        if (callback) callback(null, mongoose.connection);
      });

      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error:', {
          message: err.message,
          stack: err.stack,
          errorCode: err.code
        });
        if (callback) callback(err);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected', {
          readyState: mongoose.connection.readyState
        });
      });

      // Enable advanced debugging
      if (process.env.MONGOOSE_DEBUG === 'true') {
        mongoose.set('debug', (collectionName, method, query, doc, options) => {
          logger.debug(`Mongoose: ${collectionName}.${method}`, {
            query,
            doc,
            options,
            executionTime: new Date()
          });
        });
      }

      // Connection metrics
      setInterval(async () => {
        try {
          const adminDb = mongoose.connection.db.admin();
          const serverStatus = await adminDb.serverStatus();
          logger.debug('MongoDB server status', {
            connections: serverStatus.connections,
            memoryUsage: serverStatus.mem,
            uptime: serverStatus.uptime
          });
        } catch (metricsErr) {
          logger.error('Failed to collect MongoDB metrics', {
            error: metricsErr.message
          });
        }
      }, 60000); // Log metrics every minute

      // Graceful shutdown handlers
      process.on('SIGINT', gracefulShutdown);
      process.on('SIGTERM', gracefulShutdown);
      
      return; // Successfully connected

    } catch (err) {
      lastError = err;
      retryCount++;
      logger.warn(`MongoDB connection attempt ${retryCount}/${maxRetries} failed`, {
        error: err.message,
        retryDelay: 2000
      });
      
      if (retryCount < maxRetries) {
        await setTimeout(2000); // Wait 2 seconds before retry
      }
    }
  }

  // If we get here, all retries failed
  logger.error('MongoDB connection failed after retries', {
    attempts: retryCount,
    lastError: lastError.message,
    stack: lastError.stack
  });
  
  if (callback) callback(lastError);
  process.exit(1);
};

// Graceful shutdown handler
async function gracefulShutdown() {
  try {
    logger.info('Starting MongoDB graceful shutdown...');
    await exports.disconnect();
    logger.info('MongoDB connection closed due to app termination');
    process.exit(0);
  } catch (err) {
    logger.error('Error during graceful shutdown:', {
      message: err.message,
      stack: err.stack
    });
    process.exit(1);
  }
}

// Enhanced disconnect with timeout
exports.disconnect = async (timeoutMs = 5000) => {
  try {
    const timeoutPromise = setTimeout(timeoutMs).then(() => {
      throw new Error('MongoDB disconnection timeout reached');
    });

    await Promise.race([
      mongoose.connection.close(),
      timeoutPromise
    ]);
    
    logger.info('MongoDB disconnected gracefully', {
      disconnectedAt: new Date().toISOString()
    });
  } catch (err) {
    logger.error('Error disconnecting MongoDB:', {
      message: err.message,
      stack: err.stack
    });
    throw err;
  }
};

// Comprehensive health check
exports.checkHealth = async () => {
  try {
    const startTime = Date.now();
    await mongoose.connection.db.admin().ping();
    const pingTime = Date.now() - startTime;
    
    const serverStatus = await mongoose.connection.db.admin().serverStatus();
    const dbStats = await mongoose.connection.db.stats();
    
    return {
      status: 'up',
      responseTime: `${pingTime}ms`,
      dbState: mongoose.connection.readyState,
      dbVersion: mongoose.version,
      connections: serverStatus.connections,
      storage: {
        dataSize: dbStats.dataSize,
        storageSize: dbStats.storageSize,
        indexSize: dbStats.indexSize
      },
      lastActivity: mongoose.connection.$lastUsed
    };
  } catch (err) {
    return {
      status: 'down',
      error: err.message,
      errorCode: err.code,
      dbState: mongoose.connection?.readyState || 'disconnected',
      timestamp: new Date().toISOString()
    };
  }
};

// Connection state getter
exports.getConnectionState = () => {
  return {
    state: mongoose.connection.readyState,
    host: mongoose.connection?.host,
    port: mongoose.connection?.port,
    name: mongoose.connection?.name,
    models: mongoose.modelNames()
  };
};
