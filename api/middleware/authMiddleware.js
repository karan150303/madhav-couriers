const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const token = req.cookies?.adminToken;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized: No token in cookies' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Admin access only' });
    }

    req.admin = decoded;
    next();
  } catch (err) {
    console.error('❌ Token verification failed:', err.message);
    res.clearCookie('adminToken');
    return res.status(401).json({ success: false, message: 'Unauthorized: Invalid token' });
  }
};
