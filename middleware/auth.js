const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify admin still exists and is active
    const [admin] = await pool.execute(
      'SELECT id, username, email, role, is_active FROM admins WHERE id = ?',
      [decoded.id]
    );

    if (admin.length === 0 || !admin[0].is_active) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or inactive admin account'
      });
    }

    req.admin = admin[0];
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

module.exports = { authenticateToken };