const mongoose = require('mongoose');
const logger = require('../api/utils/logger');

module.exports = {
  connect: async () => {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: false
      });

      logger.info(`MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
      logger.error(`Database connection error: ${err.message}`);
      process.exit(1);
    }
  }
};