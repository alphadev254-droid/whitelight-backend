const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { validateOrder } = require('../middleware/validation');

// POST /api/orders - Create new order
router.post('/', validateOrder, orderController.createOrder.bind(orderController));

// GET /api/orders - Get all orders with pagination
router.get('/', orderController.getOrders.bind(orderController));

// GET /api/orders/:id - Get specific order
router.get('/:id', orderController.getOrder.bind(orderController));

// PUT /api/orders/:id/status - Update order status
router.put('/:id/status', orderController.updateOrderStatus.bind(orderController));

module.exports = router;