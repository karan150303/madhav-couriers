require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs'); // Added for file existence check

const app = express();

// ======================
// SECURITY CONFIGURATION
// ======================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://madhavcouriers.in"],
      connectSrc: ["'self'", "https://madhavcouriers.in", "wss://madhavcouriers.in"]
    }
  }
}));

// Redirect HTTP to HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.header('host')}${req.url}`);
    }
    next();
  });
}

// CORS Configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://madhavcouriers.in', 'https://www.madhavcouriers.in']
    : ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 200,
  message: JSON.stringify({
    status: 'error',
    message: 'Too many requests, please try again later'
  }),
  standardHeaders: true
});

// ======================
// SERVER & SOCKET SETUP
// ======================
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? 'https://madhavcouriers.in'
      : 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

app.set('io', io);
app.set('trust proxy', 1);

// ======================
// APPLICATION MIDDLEWARE
// ======================
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// ======================
// ROUTES
// ======================
// API Routes
app.use('/api/auth', apiLimiter, require('./api/routes/authRoutes'));
app.use('/api/shipments', apiLimiter, require('./api/routes/shipmentRoutes'));

// Health check endpoint
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// Frontend routes
['/', '/about', '/contact', '/rates'].forEach(route => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
});

// Admin routes with authentication check
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});

app.get('/admin/dashboard', (req, res) => {
  // Add authentication middleware here or in the route handler
  res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});

// ======================
// ERROR HANDLING (IMPROVED)
// ======================
// Custom 404 handler
app.use((req, res, next) => {
  const errorPagePath = path.join(__dirname, 'public', '404.html');
  
  if (fs.existsSync(errorPagePath)) {
    res.status(404).sendFile(errorPagePath);
  } else {
    res.status(404).json({
      status: 'error',
      message: 'Page not found'
    });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  // Handle JWT errors specifically
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token'
    });
  }
  
  res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
});

// ======================
// SERVER STARTUP
// ======================
const PORT = process.env.PORT || 3000;

// Database connection check before starting server
require('./config/db.config').connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
  
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
});
