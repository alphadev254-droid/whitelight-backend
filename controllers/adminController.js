const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

class AdminController {
  // Admin login
  async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required'
        });
      }

      // Find admin by username or email
      const [admins] = await pool.execute(
        'SELECT * FROM admins WHERE (username = ? OR email = ?) AND is_active = TRUE',
        [username, username]
      );

      if (admins.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      const admin = admins[0];
      const isValidPassword = await bcrypt.compare(password, admin.password);

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: admin.id, 
          username: admin.username, 
          role: admin.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          admin: {
            id: admin.id,
            username: admin.username,
            email: admin.email,
            role: admin.role
          }
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error.message
      });
    }
  }

  // Get admin profile
  async getProfile(req, res) {
    try {
      res.json({
        success: true,
        data: {
          admin: req.admin
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get profile',
        error: error.message
      });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
      }

      // Get current admin password
      const [admins] = await pool.execute(
        'SELECT password FROM admins WHERE id = ?',
        [req.admin.id]
      );

      const isValidPassword = await bcrypt.compare(currentPassword, admins[0].password);

      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await pool.execute(
        'UPDATE admins SET password = ? WHERE id = ?',
        [hashedPassword, req.admin.id]
      );

      res.json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password',
        error: error.message
      });
    }
  }
}

module.exports = new AdminController();