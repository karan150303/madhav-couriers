const mongoose = require('mongoose');
const logger = require('../api/utils/logger');

// Enhanced DB configuration
exports.connect = async () => {
  const MONGO_URI = process.env.MONGO_URI;
  
  if (!MONGO_URI) {
    logger.error('MongoDB connection string not configured');
    process.exit(1);
  }

  // Connection options for different environments
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // 5 seconds timeout
    maxPoolSize: process.env.NODE_ENV === 'production' ? 50 : 10,
    socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    family: 4, // Use IPv4, skip IPv6
    retryWrites: true,
    w: 'majority'
  };

  try {
    await mongoose.connect(MONGO_URI, options);
    
    mongoose.connection.on('connected', () => {
      logger.info(`MongoDB connected to ${mongoose.connection.host}`);
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed due to app termination');
      process.exit(0);
    });

  } catch (err) {
    logger.error('MongoDB initial connection error:', err.message);
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
  }
};
