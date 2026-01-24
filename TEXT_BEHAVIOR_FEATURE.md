# Text Behavior Feature - Text/Fabric Color Compatibility

## Overview
This feature prevents text visibility issues by controlling which fabric colors are available based on the template's text color behavior. It addresses the problem where black text on black shirts (or white text on white shirts) creates poor visibility.

## Solution Implemented

### 1. Database Schema Addition
**File:** `backend/db/postgres.js`

Added `text_behavior` column to `templates` table:
- Type: `VARCHAR(50)`
- Default: `'none'`
- Values: `'none'`, `'static-light'`, `'static-dark'`, `'user-controlled'`

### 2. Backend API Updates
**File:** `backend/routes/templates.js`

Updated all template CRUD operations to handle `text_behavior`:
- POST `/api/templates` - Create with text_behavior
- PUT `/api/templates/:id` - Update text_behavior
- POST `/api/templates/sync` - Sync with text_behavior

### 3. Frontend Template Configuration
**File:** `frontend/config/templates.js`

Added `text_behavior` field to all LOCAL_TEMPLATES:

| Template ID | text_behavior | Reasoning |
|------------|---------------|-----------|
| `bootleg-rap` | `user-controlled` | Has color pickers for text - exclude fabric color from picker |
| `photo-collage` | `none` | No text elements in design |
| `retro-name-portrait` | `user-controlled` | Has text color picker - exclude fabric color from picker |
| `polaroid-ransom-note` | `static-dark` | Black/red ransom letters - blocks white & light-pink fabrics |
| `minimalist-line-art` | `none` | No text elements |
| `couple-portrait` | `static-dark` | Black text - blocks white & light-pink fabrics |
| `romantic-save-the-date` | `user-controlled` | Has primary color picker for text - exclude fabric color |

### 4. Template Picker Fabric Filtering
**File:** `frontend/components/design/TemplatePickerModal.jsx`

Step 3 (Color Selection) now filters fabric options based on `text_behavior`:

```javascript
if (selectedTemplate?.text_behavior === 'static-dark') {
  // Text is dark (black) - exclude white and light pink fabrics
  availableColors = COLOR_OPTIONS.filter(color => 
    color.id !== 'white' && color.id !== 'light-pink'
  );
} else if (selectedTemplate?.text_behavior === 'static-light') {
  // Text is light (white/cream) - exclude black fabric
  availableColors = COLOR_OPTIONS.filter(color => 
    color.id !== 'black'
  );
}
```

### 5. Color Picker Dynamic Filtering
**File:** `frontend/components/design/AIPanel.jsx`

Updated `DynamicField` component:
- Added `shouldExcludeShirtColor` prop
- Only filters color picker options when `text_behavior === 'user-controlled'`
- Excludes white preset when white fabric is selected
- Excludes black preset when black fabric is selected
- Light pink fabric has no restrictions (not typically used as text color)

```javascript
// DynamicField function signature
function DynamicField({ 
  field, 
  value, 
  onChange, 
  excludeShirtColorHex = null, 
  shouldExcludeShirtColor = false 
})

// Usage
<DynamicField
  key={field.id}
  field={field}
  value={fieldValues[field.id]}
  onChange={(value) => updateFieldValue(field.id, value)}
  excludeShirtColorHex={backgroundColorHex}
  shouldExcludeShirtColor={selectedTemplate?.text_behavior === 'user-controlled'}
/>
```

### 6. Admin Panel Control
**File:** `frontend/pages/admin.jsx`

Added **Text Behavior** section to template management:
- Dropdown select with 4 options
- Clear descriptions of each behavior type
- Visual feedback showing current restrictions
- Real-time update on selection change

## Text Behavior Types Explained

### `none` - No Text in Design
**Use for:** Templates without any text elements
- No fabric color restrictions
- Example: Photo Collage Heart, Minimalist Line Art

### `static-light` - Light-Colored Text
**Use for:** Templates with white, cream, or light-colored text that cannot be changed
- **Blocks:** White fabric ONLY
- **Allows:** Black, Light Pink fabrics
- **Note:** Light pink is never blocked - it has enough contrast with light text
- Example: *(Currently no templates use this, but available for future use)*

### `static-dark` - Dark-Colored Text  
**Use for:** Templates with black or dark-colored text that cannot be changed
- **Blocks:** Black fabric ONLY
- **Allows:** White, Light Pink fabrics
- **Note:** Light pink is never blocked - it has enough contrast with dark text
- Examples: Polaroid Ransom Note, Couple Portrait

### `user-controlled` - User Picks Text Color
**Use for:** Templates with color picker fields for text
- **Dynamically filters** color picker options to exclude the selected fabric color
- If user selects black fabric → black color removed from text color picker
- If user selects white fabric → white color removed from text color picker
- Light pink fabric → no restrictions (not typically used as text color)
- Examples: Bootleg Rap Tee, Retro Name Portrait, Romantic Save The Date

## User Experience Flow

### Scenario 1: Static Dark Text (Couple Portrait)
1. User selects "Couple Portrait" template
2. Template Picker Step 3 shows WHITE and LIGHT PINK fabrics (black is hidden)
3. User can only proceed with white or light pink fabrics
4. Design studio generates with black text visible on light-colored fabric ✅

### Scenario 2: User-Controlled Text (Bootleg Rap)
1. User selects "Bootleg Rap Tee" template
2. User picks BLACK fabric in Template Picker
3. In AI Panel, Primary Color picker **excludes black** from available colors
4. User can only pick non-black colors for text
5. Design generates with visible text color on black fabric ✅
6. **Note:** Light pink fabric is never excluded from color picker

### Scenario 3: No Text (Photo Collage)
1. User selects "Photo Collage Heart" template
2. All fabric colors available (no restrictions)
3. No text in design, so no visibility issues ✅

## Key Rule: Light Pink is Always Available

Light pink fabric (#fce7f3) is **NEVER** blocked for any text_behavior setting because:
- It has sufficient contrast with both dark text (black) and light text (white)
- It's a pastel color that works universally
- Only pure white and pure black fabrics cause visibility issues with matching text colors

## Database Migration

The migration is **automatic** on next server start. The schema update will:
1. Add `text_behavior` column if it doesn't exist
2. Set default value to `'none'` for existing templates
3. Preserve all existing data

**Action Required:**
After deployment, go to Admin Panel → Templates tab → click "Sync All Local Templates" to update existing templates with proper `text_behavior` values.

## Testing Checklist

### Backend
- [ ] Start server and verify schema migration runs successfully
- [ ] Create new template with text_behavior via POST `/api/templates`
- [ ] Update template text_behavior via PUT `/api/templates/:id`
- [ ] Verify text_behavior is returned in GET `/api/templates`

### Frontend - Template Picker
- [ ] Select "Couple Portrait" → Verify WHITE and LIGHT PINK available, BLACK blocked
- [ ] Select "Bootleg Rap" → Verify all fabrics available
- [ ] Select "Photo Collage" → Verify all fabrics available
- [ ] Verify LIGHT PINK is ALWAYS available regardless of text_behavior

### Frontend - AI Panel Color Pickers
- [ ] "Bootleg Rap" + Black fabric → Primary color picker excludes black ✅
- [ ] "Bootleg Rap" + White fabric → Primary color picker excludes white ✅
- [ ] "Bootleg Rap" + Light Pink fabric → All colors available ✅
- [ ] "Retro Name Portrait" + Black fabric → Text color picker excludes black ✅

### Admin Panel
- [ ] Open Admin → Templates tab
- [ ] Verify "Text Behavior" section appears for each template
- [ ] Change text_behavior dropdown and verify save
- [ ] Verify current behavior description updates

## Future Enhancements

1. **Custom Color Exclusions**: Allow admin to specify exact colors to exclude per template
2. **Luminance-Based Filtering**: Auto-calculate color contrast and exclude similar colors
3. **Preview Warning**: Show warning in design studio if text color matches fabric
4. **Bulk Update**: Allow admin to set text_behavior for multiple templates at once

## Files Modified

### Backend
- `backend/db/postgres.js` - Added text_behavior column migration
- `backend/routes/templates.js` - Updated CRUD operations for text_behavior

### Frontend
- `frontend/config/templates.js` - Added text_behavior to LOCAL_TEMPLATES & fetchTemplates
- `frontend/components/design/TemplatePickerModal.jsx` - Added fabric filtering logic
- `frontend/components/design/AIPanel.jsx` - Added color picker filtering logic
- `frontend/pages/admin.jsx` - Added text_behavior management UI

## Commit Message Suggestion

```
feat: Add text_behavior field to control fabric/text color compatibility

- Add text_behavior column to templates table with 4 values:
  none, static-light, static-dark, user-controlled
- Filter fabric colors in template picker for static text templates
- Dynamically filter color picker options to exclude fabric color
- Add admin UI for managing text_behavior per template
- Set appropriate text_behavior for all existing templates

Fixes issue where black text on black shirts creates poor visibility
```
