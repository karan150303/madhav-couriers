const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    // Check if no token
    if (!token) {
        return res.status(401).json({ 
            success: false,
            message: 'No token, authorization denied' 
        });
    }

    // Verify token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if admin (you can remove this if not needed)
        if (decoded.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: 'Admin privileges required' 
            });
        }

        req.user = decoded;
        next();
    } catch (err) {
        console.error('Token verification error:', err);
        res.status(401).json({ 
            success: false,
            message: 'Token is not valid' 
        });
    }
};
