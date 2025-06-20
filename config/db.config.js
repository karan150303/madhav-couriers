const mongoose = require('mongoose');
const logger = require('../api/utils/logger');
const MONGO_URI = process.env.MONGO_URI;

exports.connect = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
      // ❌ DON'T include useCreateIndex or useFindAndModify
    });
    logger.info('MongoDB connected successfully');
  } catch (err) {
    logger.error('Database connection error:', err.message);
    process.exit(1); // stop the app
  }
};
