require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const { doubleCsrf } = require('csrf-csrf');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = express();

// Logger
const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args)
};

// CSRF Setup
const {
  generateToken,
  validateRequest,
  doubleCsrfProtection
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || 'default-secret-change-me',
  cookieName: '__Host-psifi.x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    signed: true
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getTokenFromRequest: (req) => req.headers['x-csrf-token']
});

const csrfProtection = (req, res, next) => {
  const token = generateToken(res);
  res.locals.csrfToken = token;
  next();
};

// Helmet Security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://madhavcouriers.in"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://madhavcouriers.in"],
      connectSrc: ["'self'", "https://madhavcouriers.in", "wss://madhavcouriers.in"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 63072000,
    includeSubDomains: true,
    preload: true
  }
}));

// Force HTTPS in Production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.header('host')}${req.url}`);
    }
    next();
  });
}

// CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://madhavcouriers.in', 'https://www.madhavcouriers.in']
    : ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 200,
  message: JSON.stringify({
    status: 'error',
    message: 'Too many requests, please try again later'
  }),
  standardHeaders: true,
  legacyHeaders: false
});

// Server and Socket.IO Setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? 'https://madhavcouriers.in'
      : 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true
  }
});
app.set('io', io);
app.set('trust proxy', 1);

// Middleware
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(mongoSanitize());
app.use(hpp());

// Serve static files
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0',
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// MongoDB Connection
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI not set in environment variables');

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000
    });

    logger.info('✅ MongoDB connected successfully');

    mongoose.connection.on('connected', () => logger.info('MongoDB connection active'));
    mongoose.connection.on('error', err => logger.error('MongoDB error:', err));
    mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  } catch (err) {
    logger.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
};
connectDB();

// Admin Auth Middleware
const authenticateAdmin = (req, res, next) => {
  const token = req.cookies.adminToken || req.headers.authorization?.split(' ')[1];
  if (!token) return res.redirect('/admin/login.html');

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.redirect('/admin/login.html');
  }
};

// API Routes
app.use('/api/auth', apiLimiter, require('./api/routes/authRoutes'));
app.use('/api/shipments', apiLimiter, require('./api/routes/shipmentRoutes'));

// Health Check
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Frontend Routes
['/', '/about', '/contact', '/rates'].forEach(route => {
  app.get(route, csrfProtection, (req, res) => {
    res.cookie('XSRF-TOKEN', res.locals.csrfToken, {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      httpOnly: false
    });
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
});

// Admin Login Page
app.get('/admin/login', csrfProtection, (req, res) => {
  res.cookie('XSRF-TOKEN', res.locals.csrfToken, {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    httpOnly: false
  });
  res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});

// Admin Panel (Protected)
app.use('/admin', authenticateAdmin, express.static(path.join(__dirname, 'admin'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0'
}));

// Example POST route
app.post('/api/submit-form', doubleCsrfProtection, (req, res) => {
  res.json({ status: 'success', message: 'Form submitted successfully' });
});

// 404 Page
app.use((req, res) => {
  const errorPage = path.join(__dirname, 'public', '404.html');
  fs.existsSync(errorPage)
    ? res.status(404).sendFile(errorPage)
    : res.status(404).json({ status: 'error', message: 'Not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error('Server error:', err);

  const errorResponse = {
    status: 'error',
    code: err.code || 'SERVER_ERROR',
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  };

  if (err.name === 'JsonWebTokenError') {
    errorResponse.code = 'INVALID_TOKEN';
    return res.status(401).json(errorResponse);
  }

  res.status(err.status || 500).json(errorResponse);
});

// Server Startup
const PORT = process.env.PORT || 3000;

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down...');
  await mongoose.disconnect();
  server.close(() => {
    logger.info('Server terminated');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down...');
  await mongoose.disconnect();
  server.close(() => {
    logger.info('Server terminated');
    process.exit(0);
  });
});

server.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
