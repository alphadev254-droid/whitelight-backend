const { pool } = require('../config/database');
const spacesService = require('../services/spacesService');
const multer = require('multer');

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

class ProductController {
  // Create new product
  async createProduct(req, res) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const {
        name, brand, category, price, originalPrice,
        description, tags, isNew, isBestSeller, variants
      } = req.body;

      // Generate slug and ID
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const productId = Date.now().toString();

      // Parse variants from JSON string if needed
      let parsedVariants = variants;
      if (typeof variants === 'string') {
        try {
          parsedVariants = JSON.parse(variants);
        } catch (e) {
          parsedVariants = [];
        }
      }

      // Parse tags from JSON string if needed
      let parsedTags = tags;
      if (typeof tags === 'string') {
        try {
          parsedTags = JSON.parse(tags);
        } catch (e) {
          parsedTags = [];
        }
      }

      // Insert product with all data
      await connection.execute(
        `INSERT INTO products (id, slug, name, brand, category, price, original_price, 
         description, tags, is_new, is_best_seller) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          productId, slug, name, brand, category, price, originalPrice || null,
          description, JSON.stringify(parsedTags), isNew === 'true' || isNew === true, 
          isBestSeller === 'true' || isBestSeller === true
        ]
      );

      // Handle image uploads
      if (req.files && req.files.length > 0) {
        for (let i = 0; i < req.files.length; i++) {
          const file = req.files[i];
          const uploadResult = await spacesService.uploadFile(file, 'products');
          
          console.log('📸 Image uploaded:', uploadResult.url);
          console.log('🌐 CDN URL used:', uploadResult.url.includes('cdn.digitaloceanspaces.com') ? 'YES' : 'NO');
          
          if (uploadResult.success) {
            const imageId = `${productId}-${i + 1}`;
            await connection.execute(
              'INSERT INTO product_images (id, product_id, url, alt_text) VALUES (?, ?, ?, ?)',
              [imageId, productId, uploadResult.url, name]
            );
          }
        }
      }

      // Insert variants with proper data handling
      if (parsedVariants && parsedVariants.length > 0) {
        for (const variant of parsedVariants) {
          const variantId = `${productId}-${variant.size}-${Date.now()}`;
          await connection.execute(
            'INSERT INTO product_variants (id, product_id, size, in_stock, stock_quantity) VALUES (?, ?, ?, ?, ?)',
            [variantId, productId, variant.size, variant.inStock !== false, variant.stockQuantity || 10]
          );
        }
      } else {
        // Create default variants if none provided
        const defaultSizes = [40, 41, 42, 43, 44];
        for (const size of defaultSizes) {
          const variantId = `${productId}-${size}-${Date.now()}`;
          await connection.execute(
            'INSERT INTO product_variants (id, product_id, size, in_stock, stock_quantity) VALUES (?, ?, ?, ?, ?)',
            [variantId, productId, size, true, 10]
          );
        }
      }

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: { id: productId, slug }
      });

    } catch (error) {
      await connection.rollback();
      console.error('Create product error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create product',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  // Update product
  async updateProduct(req, res) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      const { id } = req.params;
      const {
        name, brand, category, price, originalPrice,
        description, tags, isNew, isBestSeller, variants
      } = req.body;

      console.log('✏️ Update product request - ID:', id);
      console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
      console.log('📸 Files:', req.files ? req.files.length : 0);

      // Parse variants and tags from FormData
      let parsedVariants = variants;
      if (typeof variants === 'string') {
        try {
          parsedVariants = JSON.parse(variants);
        } catch (e) {
          parsedVariants = null;
        }
      }

      let parsedTags = tags;
      if (typeof tags === 'string') {
        try {
          parsedTags = JSON.parse(tags);
        } catch (e) {
          parsedTags = [];
        }
      }

      // Update product with proper data handling
      const [result] = await connection.execute(
        `UPDATE products SET name = ?, brand = ?, category = ?, price = ?, 
         original_price = ?, description = ?, tags = ?, is_new = ?, is_best_seller = ? 
         WHERE id = ?`,
        [
          name, brand, category, price, originalPrice || null,
          description, JSON.stringify(parsedTags || []), 
          isNew === 'true' || isNew === true, 
          isBestSeller === 'true' || isBestSeller === true, id
        ]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Handle new image uploads
      if (req.files && req.files.length > 0) {
        for (let i = 0; i < req.files.length; i++) {
          const file = req.files[i];
          const uploadResult = await spacesService.uploadFile(file, 'products');
          
          console.log('📸 Image uploaded:', uploadResult.url);
          console.log('🌐 CDN URL used:', uploadResult.url.includes('cdn.digitaloceanspaces.com') ? 'YES' : 'NO');
          
          if (uploadResult.success) {
            const imageId = `${id}-${Date.now()}-${i}`;
            await connection.execute(
              'INSERT INTO product_images (id, product_id, url, alt_text) VALUES (?, ?, ?, ?)',
              [imageId, id, uploadResult.url, name]
            );
          }
        }
      }

      // Update variants if provided
      if (parsedVariants && parsedVariants.length > 0) {
        // Delete existing variants
        await connection.execute('DELETE FROM product_variants WHERE product_id = ?', [id]);
        
        // Insert new variants
        for (const variant of parsedVariants) {
          const variantId = `${id}-${variant.size}`;
          await connection.execute(
            'INSERT INTO product_variants (id, product_id, size, in_stock, stock_quantity) VALUES (?, ?, ?, ?, ?)',
            [variantId, id, variant.size, variant.inStock !== false, variant.stockQuantity || 10]
          );
        }
      }

      await connection.commit();

      const response = {
        success: true,
        message: 'Product updated successfully'
      };

      console.log('✅ Product update response:', JSON.stringify(response, null, 2));

      res.json(response);

    } catch (error) {
      await connection.rollback();
      console.error('Update product error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update product',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  // Delete product
  async deleteProduct(req, res) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      const { id } = req.params;

      // Check if product is referenced in any orders
      const [orderItems] = await connection.execute(
        'SELECT COUNT(*) as count FROM order_items WHERE product_id = ?',
        [id]
      );

      if (orderItems[0].count > 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Cannot delete product. It is referenced in ${orderItems[0].count} order(s). Consider marking it as unavailable instead.`
        });
      }

      // Get all images before deleting to clean up from S3
      const [images] = await connection.execute(
        'SELECT url FROM product_images WHERE product_id = ?',
        [id]
      );

      // Delete from database first
      const [result] = await connection.execute(
        'DELETE FROM products WHERE id = ?',
        [id]
      );

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Clean up images from S3/Spaces
      for (const image of images) {
        if (image.url && image.url.includes('digitaloceanspaces.com')) {
          // Extract key from URL
          const urlParts = image.url.split('/');
          const key = urlParts.slice(-2).join('/'); // Get 'products/filename'
          await spacesService.deleteFile(key);
        }
      }

      await connection.commit();

      res.json({
        success: true,
        message: 'Product deleted successfully'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Delete product error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete product',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  // Get all products with filtering and pagination
  async getProducts(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 12;
      const offset = (page - 1) * limit;
      
      const { category, brand, search, isNew, isBestSeller, minPrice, maxPrice } = req.query;

      let query = 'SELECT * FROM products';
      let countQuery = 'SELECT COUNT(*) as total FROM products';
      const conditions = [];
      const params = [];

      if (category) {
        conditions.push('category = ?');
        params.push(category);
      }

      if (brand) {
        conditions.push('brand = ?');
        params.push(brand);
      }

      if (search) {
        conditions.push('(name LIKE ? OR description LIKE ? OR brand LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      if (isNew === 'true') {
        conditions.push('is_new = ?');
        params.push(1);
      }

      if (isBestSeller === 'true') {
        conditions.push('is_best_seller = ?');
        params.push(1);
      }

      if (minPrice) {
        conditions.push('price >= ?');
        params.push(parseFloat(minPrice));
      }

      if (maxPrice) {
        conditions.push('price <= ?');
        params.push(parseFloat(maxPrice));
      }

      if (conditions.length > 0) {
        const whereClause = ' WHERE ' + conditions.join(' AND ');
        query += whereClause;
        countQuery += whereClause;
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      
      const queryParams = params.concat([limit, offset]);
      
      console.log('🔍 Debug SQL:');
      console.log('Query:', query);
      console.log('Params:', params);
      console.log('Limit:', limit, 'Type:', typeof limit);
      console.log('Offset:', offset, 'Type:', typeof offset);
      console.log('QueryParams:', queryParams);
      
      const [products] = await pool.query(query, queryParams);
      const [countResult] = await pool.query(countQuery, params);

      // Fetch images and variants for each product
      const productsWithDetails = await Promise.all(
        products.map(async (product) => {
          const [images] = await pool.execute(
            'SELECT id, url, alt_text as alt FROM product_images WHERE product_id = ?',
            [product.id]
          );
          
          const [variants] = await pool.execute(
            'SELECT id, size, in_stock as inStock, stock_quantity as stockQuantity FROM product_variants WHERE product_id = ?',
            [product.id]
          );

          return {
            id: product.id,
            slug: product.slug,
            name: product.name,
            brand: product.brand,
            category: product.category,
            price: parseFloat(product.price),
            originalPrice: product.original_price ? parseFloat(product.original_price) : null,
            images: images,
            variants: variants,
            description: product.description,
            tags: (() => {
              try {
                return JSON.parse(product.tags || '[]');
              } catch (e) {
                console.error('Invalid JSON in tags for product:', product.id, product.tags);
                return [];
              }
            })(),
            isNew: Boolean(product.is_new),
            isBestSeller: Boolean(product.is_best_seller),
            createdAt: product.created_at
          };
        })
      );

      console.log('📦 Products fetched from DB:', JSON.stringify(productsWithDetails, null, 2));

      res.json({
        success: true,
        data: {
          products: productsWithDetails,
          pagination: {
            page,
            limit,
            total: countResult[0].total,
            pages: Math.ceil(countResult[0].total / limit)
          }
        }
      });

    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve products',
        error: error.message
      });
    }
  }

  // Get single product by ID or slug
  async getProduct(req, res) {
    try {
      const { id } = req.params;

      const [products] = await pool.execute(
        'SELECT * FROM products WHERE id = ? OR slug = ?',
        [id, id]
      );

      if (products.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      const product = products[0];
      
      // Fetch images and variants separately
      const [images] = await pool.execute(
        'SELECT id, url, alt_text as alt FROM product_images WHERE product_id = ?',
        [product.id]
      );
      
      const [variants] = await pool.execute(
        'SELECT id, size, in_stock as inStock, stock_quantity as stockQuantity FROM product_variants WHERE product_id = ?',
        [product.id]
      );

      const formattedProduct = {
        id: product.id,
        slug: product.slug,
        name: product.name,
        brand: product.brand,
        category: product.category,
        price: parseFloat(product.price),
        originalPrice: product.original_price ? parseFloat(product.original_price) : null,
        images: images,
        variants: variants,
        description: product.description,
        tags: (() => {
          try {
            return JSON.parse(product.tags || '[]');
          } catch (e) {
            console.error('Invalid JSON in tags for product:', product.id, product.tags);
            return [];
          }
        })(),
        isNew: Boolean(product.is_new),
        isBestSeller: Boolean(product.is_best_seller),
        createdAt: product.created_at
      };

      console.log('📦 Single product fetched from DB:', JSON.stringify(formattedProduct, null, 2));

      res.json({
        success: true,
        data: formattedProduct
      });

    } catch (error) {
      console.error('Get product error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve product',
        error: error.message
      });
    }
  }

  // Get product categories
  async getCategories(req, res) {
    try {
      const [categories] = await pool.execute(`
        SELECT category, COUNT(*) as count 
        FROM products 
        GROUP BY category 
        ORDER BY category
      `);

      res.json({
        success: true,
        data: categories
      });

    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve categories',
        error: error.message
      });
    }
  }

  // Get product brands
  async getBrands(req, res) {
    try {
      const [brands] = await pool.execute(`
        SELECT brand, COUNT(*) as count 
        FROM products 
        GROUP BY brand 
        ORDER BY brand
      `);

      res.json({
        success: true,
        data: brands
      });

    } catch (error) {
      console.error('Get brands error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve brands',
        error: error.message
      });
    }
  }
}

module.exports = new ProductController();