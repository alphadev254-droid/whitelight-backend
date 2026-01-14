const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken } = require('../middleware/auth');

// POST /api/admin/login - Admin login
router.post('/login', adminController.login);

// GET /api/admin/profile - Get admin profile (protected)
router.get('/profile', authenticateToken, adminController.getProfile);

// PUT /api/admin/change-password - Change password (protected)
router.put('/change-password', authenticateToken, adminController.changePassword);

module.exports = router;