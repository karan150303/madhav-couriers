const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    // Check both cookie and localStorage token
    const token = req.cookies.adminToken || 
                 req.headers.authorization?.split(' ')[1] ||
                 req.query.token;

    if (!token) {
        return res.redirect('/admin/login.html');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'admin') {
            return res.redirect('/admin/login.html');
        }
        next();
    } catch (err) {
        console.error('Dashboard auth error:', err);
        res.redirect('/admin/login.html');
    }
};
