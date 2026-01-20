const { pool } = require('../config/database');

class BannerController {
  // Get hero carousel images
  async getHeroImages(req, res) {
    try {
      const [rows] = await pool.execute(
        `SELECT pi.url, p.name as alt_text 
         FROM product_images pi 
         JOIN products p ON pi.product_id = p.id 
         WHERE p.is_new = true 
         ORDER BY p.created_at DESC 
         LIMIT 10`
      );

      res.json({
        success: true,
        data: rows
      });
    } catch (error) {
      console.error('Get hero images error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch hero images'
      });
    }
  }

  // Get category images
  async getCategoryImages(req, res) {
    try {
      const [rows] = await pool.execute(
        `SELECT DISTINCT p.category, pi.url, p.name as alt_text
         FROM products p 
         JOIN product_images pi ON p.id = pi.product_id 
         WHERE pi.id IN (
           SELECT MIN(pi2.id) 
           FROM product_images pi2 
           JOIN products p2 ON pi2.product_id = p2.id 
           GROUP BY p2.category
         )
         ORDER BY p.category`
      );

      res.json({
        success: true,
        data: rows
      });
    } catch (error) {
      console.error('Get category images error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch category images'
      });
    }
  }

  // Get CTA banner images (best sellers)
  async getCtaImages(req, res) {
    try {
      const [rows] = await pool.execute(
        `SELECT pi.url, p.name as alt_text 
         FROM product_images pi 
         JOIN products p ON pi.product_id = p.id 
         WHERE p.is_best_seller = true 
         ORDER BY RAND() 
         LIMIT 8`
      );

      res.json({
        success: true,
        data: rows
      });
    } catch (error) {
      console.error('Get CTA images error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch CTA images'
      });
    }
  }
}

module.exports = new BannerController();