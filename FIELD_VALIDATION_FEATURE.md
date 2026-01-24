# Field Validation Feature

## Overview
Added field-level validation system to template schemas. This allows templates to enforce specific rules on user input before generating designs, preventing invalid data from being sent to the AI.

## Use Case: Photo Collage Template
The photo-collage template requires text to include the word "love" because the AI prompt assumes this context. Without validation, users could enter text like "Happy Birthday" which would break the prompt logic.

## Implementation

### 1. Validation Schema Structure

Validation rules are added to individual fields in the `panel_schema`:

```javascript
{
  type: 'text',
  id: 'customText',
  label: 'Custom Text (optional)',
  placeholder: 'e.g., "I ❤️ You" or names',
  required: false,
  validation: {
    type: 'contains',           // Validation type
    value: 'love',              // Value to check for
    caseSensitive: false,       // Case-insensitive search
    errorMessage: 'Text must include the word "love" for this template'
  }
}
```

### 2. Supported Validation Types

#### `contains` - Text Must Contain Substring
```javascript
validation: {
  type: 'contains',
  value: 'love',              // Text to find
  caseSensitive: false,       // Optional, defaults to false
  errorMessage: 'Custom error message'
}
```

#### `regex` - Match Regular Expression Pattern
```javascript
validation: {
  type: 'regex',
  value: '^[A-Za-z ]+$',      // Regex pattern
  flags: 'i',                 // Optional regex flags
  errorMessage: 'Only letters and spaces allowed'
}
```

#### `minLength` - Minimum Character Length
```javascript
validation: {
  type: 'minLength',
  value: 5,                   // Minimum characters
  errorMessage: 'Must be at least 5 characters'
}
```

#### `maxLength` - Maximum Character Length
```javascript
validation: {
  type: 'maxLength',
  value: 20,                  // Maximum characters
  errorMessage: 'Must be no more than 20 characters'
}
```

### 3. Validation Logic (AIPanel.jsx)

The `validateFields()` function runs before image generation:

```javascript
const validateFields = () => {
  for (const field of selectedTemplate.panelSchema.fields) {
    const value = fieldValues[field.id];
    
    // Check required fields
    if (field.required && !value?.trim()) {
      return { valid: false, message: `${field.label} is required` };
    }
    
    // Check validation rules (only if field has a value)
    if (field.validation && value?.trim()) {
      // Run validation based on type...
    }
  }
  return { valid: true };
};
```

**Important:** Validation only runs if the field has a value. Empty optional fields skip validation.

### 4. Error Display

When validation fails:
1. Generation is blocked
2. Error message displays prominently in the AI Panel
3. User must fix the issue before proceeding

### 5. Admin Panel UI

Added comprehensive validation editor in the schema editing dialog:

**Controls:**
- **Validation Type Dropdown**: Select validation type (None, Contains, Regex, Min/Max Length)
- **Validation Value Input**: Enter the value to check (text to find, regex pattern, length number)
- **Case Sensitive Toggle**: For "contains" type only
- **Regex Flags Input**: For "regex" type only (e.g., "i" for case-insensitive)
- **Error Message Input**: Custom error message to show users
- **Validation Preview**: Shows a human-readable preview of the validation rule

**Location:** Admin Panel → Templates → Click "Edit Schema" → Expand any field → "Field Validation" section

## Photo Collage Template Configuration

Updated in `frontend/config/templates.js`:

```javascript
{
  id: 'photo-collage',
  name: 'Photo Collage Heart',
  // ...
  panel_schema: {
    showStyleTweaks: true,
    fields: [
      {
        type: 'text',
        id: 'customText',
        label: 'Custom Text (optional)',
        placeholder: 'e.g., "I ❤️ You" or names',
        required: false,
        validation: {
          type: 'contains',
          value: 'love',
          caseSensitive: false,
          errorMessage: 'Text must include the word "love" for this template',
        },
      },
    ],
  },
}
```

## User Experience Flow

### Scenario: Photo Collage with Invalid Text

1. User selects "Photo Collage Heart" template
2. User uploads a photo
3. User enters "Happy Birthday John" in the Custom Text field
4. User clicks "Generate Design"
5. ❌ **Error displayed:** "Text must include the word 'love' for this template"
6. User updates text to "Love you John"
7. User clicks "Generate Design"
8. ✅ **Validation passes**, design generates successfully

### Scenario: Empty Optional Field

1. User selects "Photo Collage Heart" template
2. User leaves Custom Text field **empty**
3. User clicks "Generate Design"
4. ✅ **Validation skipped** (field is optional and empty)
5. Design generates without text

## Testing Checklist

### Backend
- [ ] No backend changes needed (validation is frontend-only)

### Frontend - Validation Logic
- [ ] Photo Collage + empty text → validation passes ✅
- [ ] Photo Collage + "I love you" → validation passes ✅
- [ ] Photo Collage + "Love" → validation passes ✅
- [ ] Photo Collage + "LOVE" (uppercase) → validation passes ✅ (case-insensitive)
- [ ] Photo Collage + "Happy Birthday" → validation fails with error ❌
- [ ] Error message displays in AI Panel
- [ ] Cannot generate until validation passes

### Admin Panel
- [ ] Open schema editor for any template
- [ ] Add validation to a field
- [ ] Change validation type - form updates correctly
- [ ] Set case sensitivity for "contains"
- [ ] Set regex flags for "regex"
- [ ] Enter custom error message
- [ ] Preview displays correct validation description
- [ ] Save schema - validation persists
- [ ] Remove validation (set type to "None") - validation removed

## Future Enhancements

1. **Multiple Validations**: Allow multiple validation rules per field (AND logic)
2. **Custom Validators**: JavaScript function-based custom validation
3. **Dependent Validations**: Validate field A based on field B's value
4. **Async Validation**: Check against external API (e.g., profanity filter)
5. **Visual Indicators**: Show validation status in real-time as user types
6. **Validation on Blur**: Run validation when user leaves field (immediate feedback)

## Files Modified

### Frontend
- `frontend/config/templates.js` - Added validation to photo-collage template
- `frontend/components/design/AIPanel.jsx` - Enhanced validateFields() function
- `frontend/pages/admin.jsx` - Added validation UI in schema editor

## Validation Rules Best Practices

1. **Always provide clear error messages** - Tell users exactly what's wrong
2. **Use case-insensitive "contains" for text** - More forgiving UX
3. **Make validation optional if field is optional** - Don't force users to enter data
4. **Test edge cases** - Empty strings, whitespace, special characters
5. **Keep regex simple** - Complex patterns confuse users
6. **Preview validation rules** - Show users what's expected

## Example Validation Configurations

### Email Format
```javascript
validation: {
  type: 'regex',
  value: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$',
  errorMessage: 'Please enter a valid email address'
}
```

### Phone Number
```javascript
validation: {
  type: 'regex',
  value: '^\\d{3}-\\d{3}-\\d{4}$',
  errorMessage: 'Format: 123-456-7890'
}
```

### Name Length
```javascript
validation: {
  type: 'minLength',
  value: 2,
  errorMessage: 'Name must be at least 2 characters'
}
```

### Hashtag Required
```javascript
validation: {
  type: 'contains',
  value: '#',
  caseSensitive: false,
  errorMessage: 'Must include a hashtag (#)'
}
```

## Commit Message Suggestion

```
feat: Add field-level validation system to template schemas

- Add validation rules to panel_schema fields (contains, regex, min/max length)
- Implement validateFields() logic in AIPanel to block generation on invalid input
- Add comprehensive validation editor in admin panel schema UI
- Apply "must contain 'love'" validation to photo-collage template
- Show clear error messages when validation fails

Prevents invalid data from being sent to AI generation
```
