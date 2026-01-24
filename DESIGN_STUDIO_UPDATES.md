# Design Studio Updates - January 22-23, 2026

This document summarizes all major changes made to the design studio and product display functionality.

---

## 🎨 New Features

### 1. Dynamic T-Shirt Mockups by Color

**What it does:**
- The design studio canvas now dynamically switches between black, white, and pink t-shirt mockups based on the user's selected color
- Users see exactly what the shirt will look like in their chosen color before generating mockups

**Technical Implementation:**
- **Frontend:** `frontend/components/design/ProductCanvas.jsx`
  - Loads all three t-shirt mockup images on mount (`tshirt-black.png`, `tshirt-white.png`, `tshirt-pink.png`)
  - Maintains loading state for each mockup
  - Dynamically selects correct mockup based on `selectedColor` prop
  - Maps color IDs: `'black'` → black, `'white'` → white, `'light-pink'` → pink

**Files Updated:**
- `/frontend/components/design/ProductCanvas.jsx` - Dynamic image loading and selection
- `/frontend/config/templates.js` - Added `light-pink` to `COLOR_OPTIONS`

---

### 2. High-Resolution Mockup Images

**What it does:**
- Replaced all t-shirt mockup images with higher-resolution versions for better visual quality
- Images now show clearer shirt texture and more accurate color representation

**Files Replaced:**
- `/frontend/public/tshirt-black.png` - New high-res black mockup (background removed)
- `/frontend/public/tshirt-white.png` - New high-res white mockup
- `/frontend/public/tshirt-pink.png` - New high-res pink mockup

---

### 3. Template Cover Photos (Separate from AI Reference)

**What it does:**
- Templates now support separate "cover photos" for display vs "reference images" for AI generation
- **Cover Photo** (`example_image`): Shown in template picker modal and "Available Now" section on home page
- **Reference Image** (`reference_image`): Used by AI for design generation (never shown to users)
- This allows us to show polished, finished examples to users while the AI uses the actual reference template

**Technical Implementation:**

**Database Schema:**
- Added `example_image` column to `templates` table
- Existing `reference_image` column remains for AI reference

**Backend:**
- **`backend/db/postgres.js`**: Automatic migration to set cover image for Polaroid template
  ```sql
  UPDATE templates 
  SET example_image = '/templates/polaroid_cover.webp'
  WHERE id = 'polaroid-ransom-note'
  ```

**Frontend:**
- **`frontend/components/design/TemplatePickerModal.jsx`**: Displays `example_image` in picker
- **`frontend/pages/home.jsx`**: Displays `example_image` in "Available Now" section
- **`backend/routes/upload.js`**: AI generation fetches `reference_image` directly from database (line 151)

**Files Updated:**
- `/frontend/public/templates/polaroid_cover.webp` - New cover photo
- `/frontend/components/design/TemplatePickerModal.jsx`
- `/frontend/pages/home.jsx`
- `/backend/db/postgres.js`

**AI Safety:**
The AI generation endpoint (`/api/upload/generate-image`) explicitly fetches `reference_image` from the database using `template_id`, ensuring display changes never interfere with AI functionality.

---

### 4. Fixed Design Positioning (Printify 1:1 Mapping)

**What it does:**
- Designs for specific templates are automatically positioned and sized to match their exact placement on Printify products
- Users **cannot move, resize, or rotate** designs when template positioning is active
- Ensures what users see in the design studio matches exactly what will be printed

**How It Works:**

#### Database Configuration
Each template can have a `canvas_config` JSONB field with positioning rules:
```json
{
  "scale": 0.9233,      // Design width as % of print area (e.g., 92.33%)
  "x_offset": 0.0384,   // Distance from left edge of print area (3.84%)
  "y_offset": 0.0648,   // Distance from top edge of print area (6.48%)
  "rotation": 0         // Rotation in degrees
}
```

#### Coordinate System Mapping

**Printify Coordinate System:**
- Print area: 13.17" wide × 16" tall (for t-shirts)
- Position values are percentages from edges
- "Position left" = distance from LEFT edge moving RIGHT
- "Position top" = distance from TOP edge moving DOWN

**Our Canvas Coordinate System:**
- Canvas: 660px × 660px
- Print area: 25% from left, 28% from top, 50% width, 45% height (as % of canvas)
- Template positioning is applied RELATIVE to print area bounds

**Conversion Formula:**
```javascript
// Calculate design size
designWidth = printAreaWidth * config.scale
designHeight = designWidth / aspectRatio

// Calculate position (LEFT edge of design)
x = printAreaStartX + (printAreaWidth * config.x_offset)
y = printAreaStartY + (printAreaHeight * config.y_offset)
```

#### Example: Polaroid Ransom Note Template

**Printify Measurements:**
- Print area: 13.17" wide × 16" tall
- Design size: 12.16" wide × 13.93" tall
- Position: left 3.84%, top 6.48%

**Calculated Config:**
```json
{
  "scale": 0.9233,    // 12.16" ÷ 13.17" = 92.33%
  "x_offset": 0.0384, // 3.84% from left edge
  "y_offset": 0.0648, // 6.48% from top edge
  "rotation": 0
}
```

**Database Migration:**
The config is automatically applied on every deployment:
```sql
UPDATE templates 
SET canvas_config = '{"scale": 0.9233, "x_offset": 0.0384, "y_offset": 0.0648, "rotation": 0}'::jsonb
WHERE id = 'polaroid-ransom-note'
```

#### Visual Feedback

When a design is locked due to template positioning:
- **Green border** appears around the design (instead of pink)
- **"🔒 Locked Position"** label shown above the design
- **No resize handles** or rotation knob displayed
- Clicking the design still shows selection, but no manipulation is allowed

**Files Updated:**
- `/backend/db/postgres.js` - Database migration and config storage
- `/frontend/components/design/ProductCanvas.jsx` - Positioning logic and lock implementation
- `/frontend/pages/designStudio.jsx` - Pass `selectedTemplate` to canvas
- `/frontend/config/templates.js` - Include `canvas_config` in template transformation

---

## 🐛 Bug Fixes

### 1. Template Data Transformation Bug
**Problem:** `canvas_config` field was being filtered out during frontend data transformation  
**Solution:** Added `canvas_config` and `canvasConfig` to the template mapping in `fetchTemplates()`  
**File:** `/frontend/config/templates.js` (lines 268-282)

### 2. Product Page Not Updating Between Designs
**Problem:** Navigating from one design to another on product page showed stale data  
**Solution:** Added `useEffect` to reset all state when `designId` changes  
**File:** `/frontend/pages/product.jsx`

### 3. My Designs Dropdown Broken Images
**Problem:** S3 image URLs blocked by browser CORS policy  
**Solution:** Implemented image proxy to route S3 URLs through backend  
**File:** `/frontend/components/common/Navbar.jsx`

### 4. Product Page Color Inversion
**Problem:** Black button showed white mockups and vice versa  
**Solution:** Fixed fallback logic in `filterMockupsByColor` to correctly map colors  
**File:** `/frontend/pages/product.jsx`

### 5. Extra Blank Mockup Image
**Problem:** Raw `design.design_image_url` was included in product gallery  
**Solution:** Removed it from the `images` array, showing only filtered mockups  
**File:** `/frontend/pages/product.jsx`

### 6. Past Generations Hidden When Empty
**Problem:** New users couldn't see the "Past Generations" section  
**Solution:** Always display the section with a helpful empty state message  
**File:** `/frontend/pages/designStudio.jsx`

### 7. FREE Discount Orders Bypassing Approval
**Problem:** Orders with FREE discount code marked as 'paid' instead of 'pending_approval'  
**Solution:** Set status to 'pending_approval' for free orders  
**File:** `/backend/routes/orders.js`

### 8. Order Approval Failing - Missing Color
**Problem:** `printify.getVariantId` not receiving color parameter  
**Solution:** Added `order.color` parameter to variant lookup  
**File:** `/backend/routes/orders.js`

### 9. Order Approval Failing - Invalid Variant ID
**Problem:** Hardcoded variant ID didn't match actual Printify product variants  
**Solution:** Implemented dynamic variant lookup via `getProductDetails` and `getProductVariantId`  
**File:** `/backend/services/printify.js`

### 10. CORS Errors for designforwear.com
**Problem:** API calls failing due to missing domain in CORS whitelist  
**Solution:** Added `https://designforwear.com` to CORS configuration  
**File:** `/backend/server.js`

---

## 📁 File Structure Summary

### Backend Changes
```
backend/
├── db/
│   └── postgres.js              # Added canvas_config column and migration
├── routes/
│   ├── orders.js                # Fixed color parameter and free order status
│   └── templates.js             # Added debug logging for canvas_config
└── services/
    └── printify.js              # Dynamic variant ID lookup
```

### Frontend Changes
```
frontend/
├── components/
│   ├── common/
│   │   └── Navbar.jsx           # Image proxy for S3 URLs
│   └── design/
│       ├── ProductCanvas.jsx    # Dynamic mockups, positioning, locking
│       └── TemplatePickerModal.jsx # Display example_image
├── config/
│   └── templates.js             # Include canvas_config, add light-pink color
├── pages/
│   ├── designStudio.jsx         # Pass selectedTemplate to canvas
│   ├── home.jsx                 # Display example_image
│   └── product.jsx              # Fix color mapping, reset state
└── public/
    ├── tshirt-black.png         # High-res mockup
    ├── tshirt-white.png         # High-res mockup
    ├── tshirt-pink.png          # High-res mockup
    └── templates/
        └── polaroid_cover.webp  # Template cover photo
```

---

## 🔧 How to Add Fixed Positioning to a New Template

### Step 1: Get Printify Measurements
1. Create a test product in Printify
2. Position the design exactly where you want it
3. Note down:
   - Print area dimensions (width × height in inches)
   - Design dimensions (width × height in inches)
   - Position left (%)
   - Position top (%)

### Step 2: Calculate Config Values
```javascript
const scale = designWidth / printAreaWidth;
const x_offset = positionLeft / 100;  // Convert % to decimal
const y_offset = positionTop / 100;   // Convert % to decimal
```

### Step 3: Update Database
Add to `/backend/db/postgres.js` after the Polaroid config:
```javascript
const yourTemplateConfigResult = await query(`
  UPDATE templates 
  SET canvas_config = '{"scale": ${scale}, "x_offset": ${x_offset}, "y_offset": ${y_offset}, "rotation": 0}'::jsonb
  WHERE id = 'your-template-id'
  RETURNING id, canvas_config
`);
```

### Step 4: Deploy
Commit and push. Railway will automatically apply the migration.

---

## 🧪 Testing Checklist

### Dynamic Mockups
- [ ] Black color selected → Black t-shirt shows
- [ ] White color selected → White t-shirt shows
- [ ] Light Pink color selected → Pink t-shirt shows
- [ ] Mockups load without errors

### Template Cover Photos
- [ ] Template picker modal shows cover photos
- [ ] Home page "Available Now" shows cover photos
- [ ] AI generation still uses reference images (check logs)

### Fixed Positioning
- [ ] Generate Polaroid design → Appears in locked position
- [ ] Green border with "🔒 Locked Position" label shows
- [ ] Cannot drag, resize, or rotate the design
- [ ] Design matches Printify mockup position

### Product Page
- [ ] Mockups show correct colors
- [ ] No blank/broken images in gallery
- [ ] Switching between designs resets state

---

## 📝 Notes

### Scale vs Absolute Size
We use **scale** (as percentage of print area) rather than absolute pixel dimensions because:
1. Our canvas is 660×660px but Printify uses 4000×4500px print areas
2. Percentage-based scaling ensures designs look correct at any resolution
3. Easier to maintain - just update one scale value instead of width and height

### Why Offsets Are Print Area Relative
Offsets are relative to the print area start position (not the canvas) because:
1. Printify's coordinates are relative to their print area
2. Makes it easy to match Printify values 1:1
3. If we change canvas size, positioning still works correctly

### Template Config Precedence
When a template has `canvas_config`:
1. ✅ Positioning is **locked and automatic**
2. ❌ User adjustments (drag/resize/rotate) are **disabled**
3. ⚠️ The design will **always** position according to config

For templates WITHOUT `canvas_config`:
1. ✅ Design is **centered by default** (60% of print area)
2. ✅ User can **freely adjust** position, size, rotation
3. ✅ User's adjustments are **saved** to `canvas_data`

---

## 🚀 Deployment

All changes are deployed automatically:
- **Frontend (Vercel):** Deploys on push to `main` branch
- **Backend (Railway):** Deploys on push to `main` branch
- **Database migrations:** Run automatically on Railway deployment

To deploy:
```bash
git add -A
git commit -m "Your commit message"
git push origin main
```

---

## 📞 Support

For questions about these features, refer to:
- **Dynamic Mockups:** See `ProductCanvas.jsx` state management
- **Template Positioning:** See coordinate system mapping section above
- **Cover Photos:** See `TemplatePickerModal.jsx` image display logic
- **Database Config:** See `backend/db/postgres.js` migrations

---

*Last Updated: January 23, 2026*
