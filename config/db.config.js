const mongoose = require('mongoose');
const logger = require('../api/utils/logger');

// Enhanced DB configuration
exports.connect = async (callback) => {
  const MONGO_URI = process.env.MONGO_URI;
  
  if (!MONGO_URI) {
    logger.error('MongoDB connection string not configured');
    process.exit(1);
  }

  // Connection options
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000, // Increased to 10 seconds
    connectTimeoutMS: 10000,
    maxPoolSize: process.env.NODE_ENV === 'production' ? 50 : 10,
    minPoolSize: 5,
    socketTimeoutMS: 45000,
    family: 4,
    retryWrites: true,
    w: 'majority',
    retryReads: true
  };

  try {
    await mongoose.connect(MONGO_URI, options);
    
    mongoose.connection.on('connected', () => {
      logger.info(`MongoDB connected to ${mongoose.connection.host}`);
      if (callback) callback(null, mongoose.connection);
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
      if (callback) callback(err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    // Enable Mongoose debugging in development
    if (process.env.NODE_ENV === 'development') {
      mongoose.set('debug', (collectionName, method, query, doc) => {
        logger.debug(`Mongoose: ${collectionName}.${method}`, {
          query,
          doc
        });
      });
    }

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed due to app termination');
      process.exit(0);
    });

  } catch (err) {
    logger.error('MongoDB initial connection error:', err.message);
    if (callback) callback(err);
    process.exit(1);
  }
};

// Graceful disconnect
exports.disconnect = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB disconnected gracefully');
  } catch (err) {
    logger.error('Error disconnecting MongoDB:', err.message);
    throw err;
  }
};

// Health check
exports.checkHealth = async () => {
  try {
    await mongoose.connection.db.admin().ping();
    return {
      status: 'up',
      dbState: mongoose.connection.readyState,
      dbVersion: mongoose.version
    };
  } catch (err) {
    return {
      status: 'down',
      error: err.message
    };
  }
};
