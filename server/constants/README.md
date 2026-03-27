# Google Slides Constants Reference

## Quick Reference for Developers

### 📐 EMU (English Metric Units) Conversions

```
1 inch = 914,400 EMU
1 point = 12,700 EMU

Standard slide: 10" × 5.625" (16:9 ratio)
Width:  9,144,000 EMU
Height: 5,143,500 EMU
```

### 🎨 Using Color Themes

```typescript
import { COLOR_THEMES, type ColorTheme } from './slides';

// Get a theme
const theme = COLOR_THEMES['blue'];

// Apply to text
{
  foregroundColor: {
    opaqueColor: {
      rgbColor: theme.primary  // For titles
    }
  }
}

// RGB values are 0-1 range (not 0-255!)
// Example: #4285F4 = { red: 0.26, green: 0.52, blue: 0.96 }
```

### 📏 Common Sizes

```typescript
// Title box
width: TITLE_BOX_WIDTH_EMU    // 8,000,000 EMU
height: TITLE_BOX_HEIGHT_EMU   // 700,000 EMU

// Images
width: DEFAULT_IMAGE_WIDTH_EMU   // 4,000,000 EMU
height: DEFAULT_IMAGE_HEIGHT_EMU  // 3,000,000 EMU

// Font sizes
title: FONT_SIZE_TITLE_PT      // 36pt
subtitle: FONT_SIZE_SUBTITLE_PT // 20pt
body: FONT_SIZE_BODY_PT        // 16pt
```

### 🔒 Security

```typescript
// Validate image URLs
import { validateImageUrl, isUrlTrusted } from '../utils/url-validator';

const validUrl = validateImageUrl(imageUrl);  // throws if invalid
const isSafe = isUrlTrusted(imageUrl);        // returns boolean
```

### ⚡ Rate Limiting

```typescript
// Apply to routes
import { aiGenerationRateLimit } from '../middleware/rate-limit';

app.post('/api/endpoint', requireAuth, aiGenerationRateLimit, handler);
```

### 🔄 Token Management

```typescript
import { refreshGoogleToken, needsTokenRefresh } from '../utils/token-manager';

if (needsTokenRefresh(user.googleTokenExpiry)) {
  user = await refreshGoogleToken(user, oauth2Client);
}
```

### 🎨 Available Color Themes

```typescript
type ColorTheme = 'blue' | 'green' | 'purple' | 'orange' | 'teal' | 'red';

// Each theme has:
{
  primary: { red, green, blue },    // Main color for titles
  secondary: { red, green, blue },  // Accent color for subtitles
  accent: { red, green, blue }      // Light background color
}
```

### 🔢 Constants Organization

```
slides.ts
├── Dimensions (EMU)
│   ├── SLIDE_WIDTH_EMU
│   ├── SLIDE_HEIGHT_EMU
│   ├── DEFAULT_IMAGE_WIDTH_EMU
│   └── ...
├── Positions (EMU)
│   ├── TITLE_POSITION_X_EMU
│   ├── IMAGE_POSITION_X_EMU
│   └── ...
├── Font Sizes (PT)
│   ├── FONT_SIZE_TITLE_PT
│   ├── FONT_SIZE_BODY_PT
│   └── ...
├── Batch Settings
│   ├── GOOGLE_API_BATCH_SIZE
│   └── MAX_REQUESTS_PER_SLIDE
├── Colors
│   └── COLOR_THEMES
└── Security
    └── TRUSTED_IMAGE_DOMAINS
```

### 💡 Tips

1. **Always use constants** instead of hardcoded numbers
2. **Validate URLs** before inserting images
3. **Handle errors gracefully** with custom error classes
4. **Apply rate limiting** to expensive endpoints
5. **Test token refresh** in development

### 🐛 Common Pitfalls

❌ **Don't:**
```typescript
fontSize: { magnitude: 36, unit: 'PT' }  // Magic number!
```

✅ **Do:**
```typescript
fontSize: { magnitude: FONT_SIZE_TITLE_PT, unit: 'PT' }
```

❌ **Don't:**
```typescript
if (tokenExpired) {
  await oauth2Client.refreshAccessToken();  // Race condition!
}
```

✅ **Do:**
```typescript
if (needsTokenRefresh(user.googleTokenExpiry)) {
  user = await refreshGoogleToken(user, oauth2Client);  // Thread-safe
}
```

### 📚 Related Files

- [presentation.ts](../presentation.ts) - Main presentation logic
- [errors/presentation-errors.ts](../errors/presentation-errors.ts) - Error classes
- [utils/token-manager.ts](../utils/token-manager.ts) - Token refresh
- [utils/url-validator.ts](../utils/url-validator.ts) - URL security
- [middleware/rate-limit.ts](../middleware/rate-limit.ts) - Rate limiting
