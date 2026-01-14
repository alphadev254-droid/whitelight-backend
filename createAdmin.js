const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function createAdminTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
  });

  try {
    console.log('🔄 Creating admin table...');
    
    // Create admin table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'super_admin') DEFAULT 'admin',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Admin table created successfully!');

    // Create default admin user
    const defaultUsername = 'admin';
    const defaultEmail = 'admin@whitelight.com';
    const defaultPassword = 'admin123';
    
    // Hash password
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    // Check if admin already exists
    const [existingAdmin] = await connection.execute(
      'SELECT id FROM admins WHERE username = ? OR email = ?',
      [defaultUsername, defaultEmail]
    );

    if (existingAdmin.length === 0) {
      await connection.execute(
        'INSERT INTO admins (username, email, password, role) VALUES (?, ?, ?, ?)',
        [defaultUsername, defaultEmail, hashedPassword, 'super_admin']
      );
      
      console.log('✅ Default admin user created!');
      console.log('📧 Email: admin@whitelight.com');
      console.log('🔑 Username: admin');
      console.log('🔒 Password: admin123');
      console.log('⚠️  Please change the default password after first login!');
    } else {
      console.log('ℹ️  Admin user already exists, skipping creation.');
    }
    
  } catch (error) {
    console.error('❌ Admin setup failed:', error.message);
  } finally {
    await connection.end();
  }
}

createAdminTable();