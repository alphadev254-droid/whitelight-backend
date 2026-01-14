const { pool } = require('../config/database');

async function migrateToCDN() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔄 Starting CDN migration...');
    
    // First, let's see all URLs in the database
    const [allImages] = await connection.execute(
      `SELECT id, url FROM product_images`
    );
    
    console.log('📋 All images in database:');
    allImages.forEach(img => console.log(`  ${img.id}: ${img.url}`));
    
    // Get all images with old/wrong URLs
    const [images] = await connection.execute(
      `SELECT id, url FROM product_images 
       WHERE url LIKE 'https://sfo3.digitaloceanspaces.com/trendyfashion/%'
       OR url LIKE 'https://sfo3.cdn.digitaloceanspaces.com/trendyfashion/%'`
    );
    
    console.log(`📦 Found ${images.length} images to migrate`);
    
    let updated = 0;
    for (const image of images) {
      const oldUrl = image.url;
      let newUrl = oldUrl
        .replace('sfo3.digitaloceanspaces.com/trendyfashion', 'trendyfashion.sfo3.cdn.digitaloceanspaces.com')
        .replace('sfo3.cdn.digitaloceanspaces.com/trendyfashion', 'trendyfashion.sfo3.cdn.digitaloceanspaces.com');
      
      await connection.execute(
        'UPDATE product_images SET url = ? WHERE id = ?',
        [newUrl, image.id]
      );
      
      console.log(`✅ Updated: ${image.id}`);
      updated++;
    }
    
    console.log(`\n🎉 Migration complete! Updated ${updated} images to use CDN`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    connection.release();
    process.exit();
  }
}

migrateToCDN();
