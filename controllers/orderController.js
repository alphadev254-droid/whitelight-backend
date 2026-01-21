const { pool } = require('../config/database');

class OrderController {
  // Generate unique order number
  generateOrderNumber = () => {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `WL${timestamp.slice(-6)}${random}`;
  }

  // Create new order
  createOrder = async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const {
        customerName,
        customerPhone,
        customerEmail,
        deliveryAddress,
        orderNotes,
        items
      } = req.body;

      // Calculate total
      const totalAmount = items.reduce((sum, item) => 
        sum + (item.productPrice * item.quantity), 0
      );

      const orderNumber = this.generateOrderNumber();

      // Insert order
      const [orderResult] = await connection.execute(
        `INSERT INTO orders (order_number, customer_name, customer_phone, customer_email, 
         delivery_address, order_notes, total_amount) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [orderNumber, customerName, customerPhone, customerEmail || null, 
         deliveryAddress || null, orderNotes || null, totalAmount]
      );

      const orderId = orderResult.insertId;

      // Insert order items
      for (const item of items) {
        const subtotal = item.productPrice * item.quantity;
        await connection.execute(
          `INSERT INTO order_items (order_id, product_id, product_name, product_price, 
           size, selected_sizes, quantity, subtotal, product_image, reference_link) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [orderId, item.productId, item.productName, item.productPrice, 
           item.size, JSON.stringify(item.selectedSizes || [item.size]), item.quantity, subtotal, 
           item.productImage || null, item.referenceLink || null]
        );
      }

      await connection.commit();

      // Get complete order data
      const [orderRows] = await connection.execute(
        'SELECT * FROM orders WHERE id = ?',
        [orderId]
      );

      const [itemRows] = await connection.execute(
        'SELECT * FROM order_items WHERE order_id = ?',
        [orderId]
      );

      const order = orderRows[0];
      
      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: {
          order: {
            id: order.id,
            orderNumber: order.order_number,
            totalAmount: order.total_amount,
            status: order.status,
            createdAt: order.created_at
          },
          items: itemRows
        }
      });

    } catch (error) {
      await connection.rollback();
      console.error('Create order error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create order',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  // Get order by ID
  getOrder = async (req, res) => {
    try {
      const { id } = req.params;

      const [orderRows] = await pool.execute(
        'SELECT * FROM orders WHERE id = ? OR order_number = ?',
        [id, id]
      );

      if (orderRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      const [itemRows] = await pool.execute(
        'SELECT * FROM order_items WHERE order_id = ?',
        [orderRows[0].id]
      );

      res.json({
        success: true,
        data: {
          order: orderRows[0],
          items: itemRows
        }
      });

    } catch (error) {
      console.error('Get order error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve order',
        error: error.message
      });
    }
  }

  // Get all orders with pagination
  getOrders = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const status = req.query.status;

      let query = 'SELECT * FROM orders';
      let countQuery = 'SELECT COUNT(*) as total FROM orders';
      const params = [];

      if (status) {
        query += ' WHERE status = ?';
        countQuery += ' WHERE status = ?';
        params.push(status);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [orders] = await pool.query(query, params);
      const [countResult] = await pool.query(countQuery, status ? [status] : []);

      res.json({
        success: true,
        data: {
          orders,
          pagination: {
            page,
            limit,
            total: countResult[0].total,
            pages: Math.ceil(countResult[0].total / limit)
          }
        }
      });

    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve orders',
        error: error.message
      });
    }
  }

  // Update order status
  updateOrderStatus = async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
      }

      const [result] = await pool.execute(
        'UPDATE orders SET status = ? WHERE id = ? OR order_number = ?',
        [status, id, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      res.json({
        success: true,
        message: 'Order status updated successfully'
      });

    } catch (error) {
      console.error('Update order status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update order status',
        error: error.message
      });
    }
  }
}

module.exports = new OrderController();