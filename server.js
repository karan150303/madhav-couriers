require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');

// Initialize Express app
const app = express();

// ======================
// SECURITY CONFIGURATION
// ======================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://madhavcouriers.in"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://madhavcouriers.in"],
      connectSrc: ["'self'", "https://madhavcouriers.in", "wss://madhavcouriers.in"]
    }
  },
  hsts: {
    maxAge: 63072000,
    includeSubDomains: true,
    preload: true
  }
}));

// Redirect HTTP to HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
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

// Rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 200,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
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
  },
  transports: ['websocket'],
  serveClient: false,
  pingTimeout: 60000,
  pingInterval: 25000,
  allowEIO3: true
});

// Attach io to app
app.set('io', io);
app.set('trust proxy', 1); // Trust first proxy

// ======================
// APPLICATION MIDDLEWARE
// ======================
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Static files with cache control
const staticOptions = {
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : '0',
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store');
    }
  }
};
app.use(express.static(path.join(__dirname, 'public'), staticOptions));
app.use('/admin', express.static(path.join(__dirname, 'admin'), staticOptions));

// ======================
// DATABASE CONNECTION
// ======================
const db = require('./api/utils/db');
db.connect()
  .then(() => console.log('✅ Database connected to:', process.env.MONGO_URI.split('@')[1]))
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });

// ======================
// ROUTES
// ======================
// API Routes
app.use('/api/auth', apiLimiter, require('./api/routes/authRoutes'));
app.use('/api/shipments', apiLimiter, require('./api/routes/shipmentRoutes'));

// Health Check Endpoint
app.get('/health', (req, res) => res.status(200).json({ status: 'healthy' }));

// Frontend Routes
const frontendRoutes = ['/', '/about', '/contact', '/rates'];
frontendRoutes.forEach(route => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
});

// Admin Routes
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});

app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});

// ======================
// SOCKET.IO CONFIGURATION
// ======================
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Authentication failed'));
    socket.user = decoded;
    next();
  });
});

io.on('connection', (socket) => {
  console.log(`🔌 New connection: ${socket.id} (User: ${socket.user?.id || 'guest'})`);

  socket.on('subscribe-to-tracking', (trackingNumber) => {
    if (!/^[A-Z0-9]{8,20}$/.test(trackingNumber)) {
      return socket.emit('error', 'Invalid tracking number format');
    }
    socket.join(`tracking:${trackingNumber}`);
    console.log(`📦 User ${socket.user?.id} subscribed to tracking:${trackingNumber}`);
  });

  socket.on('disconnect', (reason) => {
    console.log(`❌ Disconnected (${reason}): ${socket.id}`);
  });

  socket.on('error', (err) => {
    console.error(`⚠️ Socket error (${socket.id}):`, err.message);
  });
});

// ======================
// ERROR HANDLING
// ======================
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.use((err, req, res, next) => {
  console.error('⚠️ Error:', err.stack);
  res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ======================
// SERVER STARTUP
// ======================
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`
  🚀 Server running in ${process.env.NODE_ENV} mode
  ${process.env.NODE_ENV === 'production'
    ? `🔗 Production: https://madhavcouriers.in`
    : `🔗 Development: http://${HOST}:${PORT}`}
  🔐 JWT expires in: ${process.env.JWT_EXPIRE}
  📡 Socket.IO ready
  `);
});

// ======================
// PROCESS MANAGEMENT
// ======================
process.on('unhandledRejection', (err) => {
  console.error('⚠️ Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Closing server...');
  server.close(() => {
    db.disconnect().finally(() => {
      console.log('💤 Process terminated');
      process.exit(0);
    });
  });
});
