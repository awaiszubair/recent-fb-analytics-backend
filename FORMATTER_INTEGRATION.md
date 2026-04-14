# Integration Guide: Using Formatter with Insights Service

## Overview
The formatter normalizes dynamic Meta API responses to match the database schema defined in `schema.js`.

## Example: Update insights.service.js

Add the formatter import at the top:
```javascript
const formatter = require('../utils/formatter');
```

### Update getPageInsights method:
```javascript
async getPageInsights(pageId, metrics, options = {}) {
  try {
    const { access_token, ... } = options;
    
    // ... validation code ...
    
    const response = await axios.get(
      `${GRAPH_API_BASE_URL}/${pageId}/insights`,
      { params, timeout: 30000 }
    );

    // ✅ Format the response
    const formattedInsights = formatter.formatPageInsights(pageId, response.data);

    return {
      success: true,
      pageId,
      metrics,
      data: formattedInsights, // Now formatted to schema
    };
  } catch (error) {
    // ... error handling ...
  }
}
```

### Update getPostInsights method:
```javascript
async getPostInsights(postId, metrics, options = {}) {
  try {
    const { access_token, ... } = options;
    
    // ... validation code ...
    
    const response = await axios.get(
      `${GRAPH_API_BASE_URL}/${postId}/insights`,
      { params, timeout: 30000 }
    );

    // ✅ Format the response
    const formattedInsights = formatter.formatPostInsights(postId, response.data);

    return {
      success: true,
      postId,
      metrics,
      data: formattedInsights, // Now formatted to schema
    };
  } catch (error) {
    // ... error handling ...
  }
}
```

### Update getPostCommentsCount method:
```javascript
async getPostCommentsCount(postId, options = {}) {
  try {
    const { access_token } = options;
    
    // ... validation code ...
    
    const response = await axios.get(
      `${GRAPH_API_BASE_URL}/${postId}`,
      { params, timeout: 30000 }
    );

    // ✅ Format the response
    const formattedComments = formatter.formatCommentsCount(postId, response.data);

    return {
      success: true,
      postId,
      metric: 'comments.summary.total_count',
      data: formattedComments, // Now formatted to schema
    };
  } catch (error) {
    // ... error handling ...
  }
}
```

### Update getPostSharesCount method:
```javascript
async getPostSharesCount(postId, options = {}) {
  try {
    const { access_token } = options;
    
    // ... validation code ...
    
    const response = await axios.get(
      `${GRAPH_API_BASE_URL}/${postId}`,
      { params, timeout: 30000 }
    );

    // ✅ Format the response
    const formattedShares = formatter.formatSharesCount(postId, response.data);

    return {
      success: true,
      postId,
      metric: 'shares.count',
      data: formattedShares, // Now formatted to schema
    };
  } catch (error) {
    // ... error handling ...
  }
}
```

### Update getUserDetails method:
```javascript
async getUserDetails(options = {}) {
  try {
    const { access_token, fields = 'id,name,email,picture' } = options;
    
    // ... validation code ...
    
    const response = await axios.get(
      `${GRAPH_API_BASE_URL}/me`,
      { params, timeout: 30000 }
    );

    // ✅ Format the response
    const formattedUser = formatter.formatUserDetails(response.data);

    return {
      success: true,
      data: formattedUser, // Now formatted to schema
    };
  } catch (error) {
    // ... error handling ...
  }
}
```

## Formatter Functions Reference

### `formatPageInsights(pageId, metaResponse)`
Converts Meta's page insights array to schema format:
- Handles nested `values` array
- Extracts `value`, `end_time`, `period`
- Returns array of objects matching `page_insights` schema

**Input (Meta):**
```json
{
  "data": [
    {
      "name": "page_impressions",
      "period": "day",
      "values": [
        { "value": 1000, "end_time": "2026-04-09T00:00:00+0000" }
      ]
    }
  ]
}
```

**Output (Formatted):**
```json
[
  {
    "metric_name": "page_impressions",
    "metric_value": { "value": 1000, "raw": {...} },
    "period": "day",
    "end_time": "2026-04-09T00:00:00Z"
  }
]
```

---

### `formatPostInsights(postId, metaResponse)`
Same as `formatPageInsights` but for post-level insights.

---

### `formatCommentsCount(postId, metaResponse)`
Handles nested comments count:
- Extracts from `comments.summary.total_count`
- Safe fallback to 0 if not present
- Keeps original for reference

**Input (Meta):**
```json
{
  "comments": {
    "summary": {
      "total_count": 42
    }
  }
}
```

**Output (Formatted):**
```json
{
  "metric_name": "comments.summary.total_count",
  "metric_value": { "count": 42, "raw": {...} }
}
```

---

### `formatSharesCount(postId, metaResponse)`
Same as `formatCommentsCount` but for shares.

---

### `formatUserDetails(metaResponse)`
Flattens user details:
- Maps `picture.data.url` to `picture_url`
- Handles missing fields safely
- Includes original response as `raw`

---

### `formatConnectedPage(partnerId, metaResponse)`
Formats page data for `connected_pages` table:
- Requires `partnerId` (from database)
- Maps `id` to `fb_page_id`
- Converts `fan_count` to integer

---

### `formatPost(pageId, metaResponse)`
Formats post data for `posts` table:
- Requires `pageId` (from database)
- Maps `id` to `fb_post_id`
- Converts `created_time` to Date object

---

### `getNestedValue(obj, path)`
Safe utility for deep object navigation:
```javascript
const value = getNestedValue(response, 'data.insights.0.values.0.value');
// Returns null if any level is missing (no errors)
```

## Safety Features

✅ All methods include:
- Error handling with console logging
- Safe extraction of nested values
- Default values when fields missing
- Original Meta response kept as `raw` field for debugging
- Type conversions (integers, dates)
- No assumptions about Meta response structure

## Keep It Simple

- No complex transformations
- Direct field mapping where possible
- Preserve original `raw` data for debugging
- Fail gracefully with defaults
- Minimal dependencies
