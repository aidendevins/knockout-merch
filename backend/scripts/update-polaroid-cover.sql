-- Update Polaroid Ransom Note template cover image
-- This updates the example_image (cover shown to users)
-- The reference_image (AI reference) remains unchanged

UPDATE templates 
SET 
  example_image = '/templates/polaroid_cover.webp',
  updated_at = CURRENT_TIMESTAMP
WHERE id = 'polaroid-ransom-note';

-- Verify the update
SELECT 
  id, 
  name, 
  example_image as cover_image, 
  reference_image as ai_reference_image
FROM templates 
WHERE id = 'polaroid-ransom-note';
