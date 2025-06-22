const dotenv = require('dotenv');
const path = require('path');
const logger = require('../api/utils/logger');

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : process.env.NODE_ENV === 'test'
    ? '.env.test'
    : '.env';

dotenv.config({ path: path.resolve(__dirname, `../${envFile}`) });

// Validate required environment variables
const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'PORT',
  'NODE_ENV'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

module.exports = {
  // Server Configuration
  server: {
    port: parseInt(process.env.PORT, 10) || 3000,
    env: process.env.NODE_ENV || 'development',
    host: process.env.HOST || '0.0.0.0',
    trustProxy: process.env.TRUST_PROXY === 'true'
  },

  // Database Configuration
  database: {
    uri: process.env.MONGO_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: process.env.NODE_ENV === 'production' ? 50 : 10,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: 'majority'
    }
  },

  // Authentication Configuration
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpire: process.env.JWT_EXPIRE || '1h',
    saltRounds: parseInt(process.env.SALT_ROUNDS, 10) || 12,
    refreshTokenExpire: process.env.REFRESH_TOKEN_EXPIRE || '7d'
  },

  // Rate Limiting Configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100
  },

  // Email Configuration (if applicable)
  email: {
    service: process.env.EMAIL_SERVICE || 'gmail',
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: process.env.CORS_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: process.env.CORS_CREDENTIALS === 'true'
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    directory: process.env.LOG_DIR || 'logs',
    maxFiles: parseInt(process.env.LOG_MAX_FILES, 10) || 14 // 2 weeks retention
  },

  // Security Configuration
  security: {
    csrf: {
      enabled: process.env.CSRF_ENABLED !== 'false',
      secret: process.env.CSRF_SECRET
    },
    helmet: {
      enabled: process.env.HELMET_ENABLED !== 'false'
    }
  },

  // Get complete config for debugging
  getConfig: function() {
    return {
      server: this.server,
      database: { ...this.database, uri: '***' }, // Hide sensitive URI
      auth: { ...this.auth, jwtSecret: '3d8ac43390eb0108a6cbb9a8ec60f444' }, // Hide secret
      rateLimit: this.rateLimit,
      email: { ...this.email, auth: { user: this.email.auth.user, pass: '***' } },
      cors: this.cors,
      logging: this.logging,
      security: this.security
    };
  }
};
