# Testing Slides Generation

## Issue Fixed

**Problem:** Rate limiting middleware was imported in the middle of route registration, causing it to be unavailable when routes were being defined.

**Solution:** Moved the middleware import to the top of the `registerRoutes()` function.

---

## How to Test Slides Generation

### 1. **Open Developer Console**
- Press `F12` in your browser
- Go to the **Console** tab
- Clear any previous messages

### 2. **Try to Generate Slides**
1. Fill in the presentation form:
   - Title: "Test Presentation"
   - Topic: "Solar System"
   - Grade Level: "Grade 5"
   - Age Range: "10-11"
   - Add at least 1 learning outcome
   - Set number of slides: 5-10

2. Click "Generate Slides with AI"

### 3. **Check Console for Logs**

You should see:
```
Generate mutation success, received data: Object
Slides data: Array(X)
```

**If you see errors:**
- `401 Unauthorized` → Session expired, refresh page
- `429 Too Many Requests` → Rate limit hit, wait 60 seconds
- `504 Timeout` → OpenAI is slow, try fewer slides
- `500 Server Error` → Check server logs

### 4. **Check Network Tab**
- Go to **Network** tab in DevTools
- Look for request to `/api/presentation/generate`
- Click on it to see:
  - **Status:** Should be `200 OK`
  - **Response:** Should contain `{ slides: [...], generatedDate: "..." }`
  - **Headers:** Should have `X-RateLimit-Limit`, `X-RateLimit-Remaining`

---

## Expected Behavior

### ✅ **Success Response**
```json
{
  "slides": [
    {
      "id": "slide-1",
      "type": "title",
      "title": "The Solar System",
      "subtitle": "Exploring Our Cosmic Neighborhood",
      "imageUrl": "solar system planets",
      "imageAlt": "Colorful illustration of planets in solar system",
      "notes": "Welcome students! Today we'll explore..."
    },
    // ... more slides
  ],
  "generatedDate": "2025-12-30T..."
}
```

### ✅ **Rate Limit Headers**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1735567890
```

### ❌ **Rate Limit Error (if you generate too quickly)**
```json
{
  "message": "Too many AI generation requests. Please wait before generating more content.",
  "retryAfter": 45
}
```

---

## Debugging Tips

### If slides aren't generating:

**1. Check OpenAI API Key**
```bash
# In server logs, look for:
"OPENAI_API_KEY is not set"
```

**2. Check Request Body**
```javascript
// In browser console:
// Look for the request payload in Network tab
{
  "topic": "...",
  "gradeLevel": "...",
  "ageRange": "...",
  "learningOutcomes": ["..."],
  "numberOfSlides": 10,
  "customInstructions": "..." // optional
}
```

**3. Check Server Logs**
```bash
# Should see:
Presentation generation started: { topic: '...', numberOfSlides: 10, ... }
Presentation generation completed: 10 slides
```

**4. Verify Rate Limiting Middleware Loaded**
```bash
# Server should NOT show:
TypeError: aiGenerationRateLimit is not a function
```

---

## Rate Limiting Behavior

### Current Limits
- **AI Generation:** 10 requests per minute per user
- **Presentation Creation:** 5 presentations per 5 minutes per user
- **Image Search:** 30 requests per minute per user

### Testing Rate Limits
1. Generate slides 11 times rapidly (within 60 seconds)
2. 11th request should return:
   ```json
   {
     "message": "Too many AI generation requests. Please wait before generating more content.",
     "retryAfter": <seconds until reset>
   }
   ```
3. Wait for the time shown in `retryAfter`
4. Try again - should work

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| No slides generated | Rate limit import missing | ✅ FIXED - Moved import to top |
| `aiGenerationRateLimit is not a function` | Middleware not loaded | Restart server |
| Timeout after 25 seconds | OpenAI slow or too many slides | Reduce slide count to 5-10 |
| 401 error | Session expired | Refresh page and log in |
| Empty array returned | OpenAI API error | Check server logs for details |

---

## Next Steps

After confirming slides generate successfully:

1. ✅ Test color theme selection
2. ✅ Test creating Google Slides presentation
3. ✅ Verify colors appear in Google Slides
4. ✅ Check warnings are displayed if any
5. ✅ Test rate limiting (generate 11 times quickly)

---

**Last Updated:** 2025-12-30
**Status:** Rate limiting middleware fixed and moved to correct location
