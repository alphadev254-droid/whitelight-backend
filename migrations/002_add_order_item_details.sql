-- Migration: Add image and reference link to order items
-- This allows admin to see exactly which image and sizes customer selected

ALTER TABLE order_items 
ADD COLUMN product_image VARCHAR(500),
ADD COLUMN selected_sizes JSON,
ADD COLUMN reference_link VARCHAR(1000);

-- Update existing records to have basic image (first image of product)
UPDATE order_items oi
SET product_image = (
    SELECT pi.url 
    FROM product_images pi 
    WHERE pi.product_id = (
        SELECT p.id 
        FROM products p 
        WHERE p.name = oi.product_name 
        LIMIT 1
    ) 
    LIMIT 1
)
WHERE product_image IS NULL;