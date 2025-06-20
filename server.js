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
const jwt = require('jsonwebtoken');

const app = express();

// =============================================
// MONGO DB CONNECTION (Using your provided URI)
// =============================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:Snaka%40786@madhav.kfaoq1n.mongodb.net/?retryWrites=true&w=majority&appName=madhav';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Event listeners for MongoDB connection
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected');
});

// =============================================
// SECURITY MIDDLEWARE
// =============================================
app.set('trust proxy', 1); // Essential for Render

// Enhanced security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "https://madhav.kfaoq1n.mongodb.net"]
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    process.env.ADMIN_URL || 'http://localhost:3000'
  ],
  credentials: true
}));

// =============================================
// APPLICATION MIDDLEWARE
// =============================================
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));
app.use(cookieParser(process.env.COOKIE_SECRET || 'your-secret-key'));

// Data sanitization
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      message: 'Too many requests, please try again later'
    });
  }
});
app.use(limiter);

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// =============================================
// STATIC FILES AND ROUTES
// =============================================
// Static files with cache control
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store');
    }
  }
}));

// Admin authentication middleware
const verifyAdminToken = (req, res, next) => {
  const token = req.cookies.adminToken || req.headers['authorization']?.split(' ')[1];
  
  if (!token) return res.status(401).redirect('/admin/login');

  jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret', (err, decoded) => {
    if (err) {
      res.clearCookie('adminToken');
      return res.status(401).redirect('/admin/login');
    }
    req.admin = decoded;
    next();
  });
};

// API Routes
app.use('/api/auth', require('./api/routes/authRoutes'));
app.use('/api/shipments', require('./api/routes/shipmentRoutes'));

// Frontend routes
const serveFrontend = (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
};
['/', '/about', '/contact', '/rates', '/tracking'].forEach(route => {
  app.get(route, serveFrontend);
});

// Admin routes
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});

app.get('/admin/dashboard', verifyAdminToken, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    dbState: mongoose.connection.readyState,
    timestamp: new Date() 
  });
});

// =============================================
// ERROR HANDLING
// =============================================
// 404 handler
app.use('*', (req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Error middleware
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({ 
    status: 'error',
    message: 'Something went wrong!'
  });
});

// =============================================
// SERVER INITIALIZATION
// =============================================
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('Server and MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});
