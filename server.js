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

// 🔐 CSRF setup
const {
  generateToken,
  validateRequest,
  doubleCsrfProtection
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || 'default-secret',
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

// 🛡️ Helmet + CSP fix
app.use(helmet({
  contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'",
      "https://madhavcouriers.in",
      "https://cdn.socket.io"
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'",
      "https://fonts.googleapis.com",
      "https://cdnjs.cloudflare.com"
    ],
    fontSrc: [
      "'self'",
      "https://fonts.gstatic.com",
      "https://cdnjs.cloudflare.com"
    ],
    imgSrc: [
      "'self'",
      "data:",
      "https://madhavcouriers.in",
      "https://images.unsplash.com"
    ],
    connectSrc: [
      "'self'",
      "https://madhavcouriers.in",
      "wss://madhavcouriers.in"
    ],
    frameSrc: ["'self'"],
    objectSrc: ["'none'"]
  }
}

  hsts: {
    maxAge: 63072000,
    includeSubDomains: true,
    preload: true
  }
}));

// 🌐 Force HTTPS
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.header('host')}${req.url}`);
    }
    next();
  });
}

// 🌐 CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://madhavcouriers.in', 'https://www.madhavcouriers.in']
    : ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

// ⏳ Rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 200,
  message: JSON.stringify({ status: 'error', message: 'Too many requests' }),
  standardHeaders: true,
  legacyHeaders: false
});

// 🌐 WebSocket Setup
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

// 🧰 Middleware
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(mongoSanitize());
app.use(hpp());

// 📁 Public static files
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0',
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// 🧠 MongoDB Connect
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI not set');
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000
    });
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB Error:', err.message);
    process.exit(1);
  }
};
connectDB();

// 🔐 Authenticate Admin
const authenticateAdmin = (req, res, next) => {
  const token = req.cookies?.adminToken;
  if (!token) {
    console.log('⛔ No token found in cookie');
    return res.redirect('/admin/login.html');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    console.log('✅ Authenticated admin:', decoded);
    next();
  } catch (err) {
    console.error('❌ Invalid token:', err.message);
    res.clearCookie('adminToken');
    return res.redirect('/admin/login.html');
  }
};

// 🔗 Routes
app.use('/api/auth', apiLimiter, require('./api/routes/authRoutes'));
app.use('/api/shipments', apiLimiter, require('./api/routes/shipmentRoutes'));

// ✅ Health check
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// 📄 Public pages with CSRF token
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

// 🪪 Login routes (unprotected)
app.get('/admin/login', csrfProtection, (req, res) => {
  res.cookie('XSRF-TOKEN', res.locals.csrfToken, {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    httpOnly: false
  });
  res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});

app.use('/admin/login.html', express.static(path.join(__dirname, 'admin', 'login.html')));
app.use('/admin/login.js', express.static(path.join(__dirname, 'admin', 'login.js')));

// 🔐 Admin panel (protected)
app.use('/admin', authenticateAdmin, express.static(path.join(__dirname, 'admin'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0'
}));

// ✅ CSRF test route
app.post('/api/submit-form', doubleCsrfProtection, (req, res) => {
  res.json({ status: 'success', message: 'Form submitted' });
});

// 404 Handler
app.use((req, res) => {
  const errorPage = path.join(__dirname, 'public', '404.html');
  fs.existsSync(errorPage)
    ? res.status(404).sendFile(errorPage)
    : res.status(404).json({ status: 'error', message: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  const errorResponse = {
    status: 'error',
    code: err.code || 'SERVER_ERROR',
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  };

  if (err.name === 'JsonWebTokenError') {
    errorResponse.code = 'INVALID_TOKEN';
    return res.status(401).json(errorResponse);
  }

  res.status(err.status || 500).json(errorResponse);
});

// 🏁 Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
