const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/products - Get all products with filtering
router.get('/', productController.getProducts);

// GET /api/products/categories - Get product categories
router.get('/categories', productController.getCategories);

// GET /api/products/brands - Get product brands
router.get('/brands', productController.getBrands);

// GET /api/products/:id - Get specific product
router.get('/:id', productController.getProduct);

// Admin protected routes
// POST /api/products - Create new product (admin only)
router.post('/', authenticateToken, upload.array('images', 5), productController.createProduct);

// PUT /api/products/:id - Update product (admin only)
router.put('/:id', authenticateToken, upload.array('images', 5), productController.updateProduct);

// DELETE /api/products/:id - Delete product (admin only)
router.delete('/:id', authenticateToken, productController.deleteProduct);

module.exports = router;