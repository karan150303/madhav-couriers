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
      scriptSrc: ["'self'", "'unsafe-inline'", `https://${process.env.DOMAIN || 'madhavcouriers.in'}`],
      connectSrc: ["'self'", `https://${process.env.DOMAIN || 'madhavcouriers.in'}`, `wss://${process.env.DOMAIN || 'madhavcouriers.in'}`]
    }
  },
  hsts: {
    maxAge: 63072000, // 2 years
    includeSubDomains: true,
    preload: true
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
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [`https://${process.env.DOMAIN || 'madhavcouriers.in'}`, `https://www.${process.env.DOMAIN || 'madhavcouriers.in'}`]
  : ['http://localhost:3000'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
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
      ? `https://${process.env.DOMAIN || 'madhavcouriers.in'}`
      : 'http://localhost:3000',
    methods: ['GET', 'POST']
  },
  transports: ['websocket'],
  serveClient: false,
  pingTimeout: 60000
});

// Attach io to app
app.set('io', io);
app.set('trust proxy', 1);

// ======================
// APPLICATION MIDDLEWARE
// ======================
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Static files with cache control
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : '0',
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store');
    }
  }
});

// ======================
// DATABASE CONNECTION
// ======================
const db = require('./api/utils/db');
db.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Database connected successfully'))
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });

// ======================
// ROUTES
// ======================
// API Routes with rate limiting
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

// Admin routes
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});

app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});

// ======================
// SOCKET.IO AUTHENTICATION
// ======================
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Invalid token'));
    socket.user = decoded;
    next();
  });
});

io.on('connection', (socket) => {
  console.log(`🔌 New connection: ${socket.id}`);

  socket.on('subscribe-to-tracking', (trackingNumber) => {
    if (!/^[A-Z0-9]{8,20}$/.test(trackingNumber)) {
      return socket.emit('error', 'Invalid tracking number format');
    }
    socket.join(`tracking:${trackingNumber}`);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Disconnected: ${socket.id}`);
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
      : err.message
  });
});

// ======================
// SERVER STARTUP
// ======================
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
  🚀 Server running in ${process.env.NODE_ENV} mode
  🔗 External: https://${process.env.DOMAIN || 'madhavcouriers.in'}
  📡 Local: http://localhost:${PORT}
  🔐 JWT expires in: ${process.env.JWT_EXPIRE}
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Closing server...');
  server.close(() => {
    db.disconnect().then(() => {
      console.log('💤 Process terminated');
      process.exit(0);
    });
  });
});
