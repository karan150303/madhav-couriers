// Placeholder for logger.jsconst logger = {
  info: (...params) => {
    console.log('[INFO]', ...params);
  },
  error: (...params) => {
    console.error('[ERROR]', ...params);
  }
};

module.exports = logger;
