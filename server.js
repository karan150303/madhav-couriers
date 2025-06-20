require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const morgan = require('morgan');

const app = express();

// Database connection
const db = require('./config/db.config');
db.connect();

// Trust proxies if behind reverse proxy (e.g., Nginx)
app.set('trust proxy', 1);

// Enhanced security middleware
app.use(helmet());
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL,
      process.env.ADMIN_URL
    ],
    credentials: true
  })
);

// Body parsers
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Cookie parser
app.use(cookieParser());

// Data sanitization
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// Rate limiting - stricter for auth routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many requests from this IP, please try again later'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many login attempts, please try again later'
});

app.use(generalLimiter);
app.use('/api/auth', authLimiter);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static files - with cache control
app.use(
  express.static(path.join(__dirname, 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0'
  })
);

// Admin static files (with auth check)
app.use(
  '/admin',
  express.static(path.join(__dirname, 'admin'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0'
  })
);

// API Routes
app.use('/api/auth', require('./api/routes/authRoutes'));
app.use('/api/shipments', require('./api/routes/shipmentRoutes'));

// Frontend routes
const serveFrontend = (page) => (req, res) => {
  res.sendFile(path.join(__dirname, 'public', `${page}.html`));
};

['/', '/about', '/contact', '/rates'].forEach(route => {
  app.get(route, serveFrontend(route === '/' ? 'index' : route.slice(1)));
});

// Admin route handlers with token verification
const verifyAdminToken = (req, res, next) => {
  const token = req.cookies.adminToken || req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.redirect('/admin/login');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    res.redirect('/admin/login');
  }
};

// Protected admin routes
app.get('/admin/dashboard', verifyAdminToken, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});

// Error handling middleware
const errorHandler = require('./api/middleware/errorMiddleware');
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Server startup
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
