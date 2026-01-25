const express = require('express');
const router = express.Router();
const db = require('../db/postgres');

// Helper to parse user agent for device/browser info
function parseUserAgent(ua) {
  if (!ua) return { device: 'unknown', browser: 'unknown' };
  
  let device = 'desktop';
  if (/mobile/i.test(ua)) device = 'mobile';
  else if (/tablet|ipad/i.test(ua)) device = 'tablet';
  
  let browser = 'unknown';
  if (/chrome/i.test(ua) && !/edge|edg/i.test(ua)) browser = 'Chrome';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/edge|edg/i.test(ua)) browser = 'Edge';
  else if (/opera|opr/i.test(ua)) browser = 'Opera';
  
  return { device, browser };
}

// Helper to get client IP (handles proxies)
function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || req.connection?.remoteAddress || req.ip || 'unknown';
}

// Build SQL clause: exclude null city + restricted cities (from DB)
async function getExcludeCitiesClause() {
  const rows = await db.all('SELECT city FROM analytics_restricted_cities ORDER BY city');
  const cities = (rows || []).map((r) => String(r.city || '').trim().toLowerCase()).filter(Boolean);
  const escaped = cities.map((c) => `'${c.replace(/'/g, "''")}'`);
  const notIn = escaped.length ? ` AND LOWER(TRIM(city)) NOT IN (${escaped.join(', ')})` : '';
  return `AND city IS NOT NULL${notIn}`;
}

// Track an analytics event
router.post('/track', async (req, res) => {
  try {
    const { 
      event_type, 
      event_data = {}, 
      page_url, 
      referrer, 
      session_id,
      user_id 
    } = req.body;

    if (!event_type) {
      return res.status(400).json({ error: 'event_type is required' });
    }

    const ip_address = getClientIP(req);
    const user_agent = req.headers['user-agent'];
    const { device, browser } = parseUserAgent(user_agent);

    // Try to get geo data from IP using a free service
    let country = null, city = null, region = null;
    
    // Use ip-api.com for geolocation (free, no API key needed for non-commercial)
    // In production, you might want to use a more robust service
    if (ip_address && ip_address !== 'unknown' && !ip_address.startsWith('127.') && !ip_address.startsWith('192.168.') && ip_address !== '::1') {
      try {
        const geoResponse = await fetch(`http://ip-api.com/json/${ip_address}?fields=status,country,regionName,city`);
        const geoData = await geoResponse.json();
        if (geoData.status === 'success') {
          country = geoData.country;
          city = geoData.city;
          region = geoData.regionName;
        }
      } catch (geoErr) {
        console.warn('Geo lookup failed:', geoErr.message);
      }
    }

    // Insert the event
    const result = await db.query(`
      INSERT INTO analytics_events 
      (event_type, event_data, page_url, referrer, ip_address, country, city, region, user_agent, device_type, browser, session_id, user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `, [
      event_type,
      JSON.stringify(event_data),
      page_url,
      referrer,
      ip_address,
      country,
      city,
      region,
      user_agent,
      device,
      browser,
      session_id,
      user_id || null
    ]);

    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// Get analytics summary (for admin dashboard)
router.get('/summary', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));

    // Get total events by type
    const eventsByType = await db.all(`
      SELECT event_type, COUNT(*) as count
      FROM analytics_events
      WHERE created_at >= $1
      GROUP BY event_type
      ORDER BY count DESC
    `, [daysAgo]);

    // Get unique visitors (by session_id)
    const uniqueVisitors = await db.get(`
      SELECT COUNT(DISTINCT session_id) as count
      FROM analytics_events
      WHERE created_at >= $1
    `, [daysAgo]);

    // Get page views
    const pageViews = await db.get(`
      SELECT COUNT(*) as count
      FROM analytics_events
      WHERE event_type = 'page_view' AND created_at >= $1
    `, [daysAgo]);

    // Get visitors by country
    const visitorsByCountry = await db.all(`
      SELECT country, COUNT(DISTINCT session_id) as visitors
      FROM analytics_events
      WHERE country IS NOT NULL AND created_at >= $1
      GROUP BY country
      ORDER BY visitors DESC
      LIMIT 20
    `, [daysAgo]);

    // Get visitors by device type
    const visitorsByDevice = await db.all(`
      SELECT device_type, COUNT(DISTINCT session_id) as visitors
      FROM analytics_events
      WHERE device_type IS NOT NULL AND created_at >= $1
      GROUP BY device_type
      ORDER BY visitors DESC
    `, [daysAgo]);

    // Get visitors by browser
    const visitorsByBrowser = await db.all(`
      SELECT browser, COUNT(DISTINCT session_id) as visitors
      FROM analytics_events
      WHERE browser IS NOT NULL AND browser != 'unknown' AND created_at >= $1
      GROUP BY browser
      ORDER BY visitors DESC
    `, [daysAgo]);

    // Get top pages
    const topPages = await db.all(`
      SELECT page_url, COUNT(*) as views
      FROM analytics_events
      WHERE event_type = 'page_view' AND created_at >= $1
      GROUP BY page_url
      ORDER BY views DESC
      LIMIT 10
    `, [daysAgo]);

    // Get daily visitors for chart
    const dailyVisitors = await db.all(`
      SELECT DATE(created_at) as date, COUNT(DISTINCT session_id) as visitors
      FROM analytics_events
      WHERE created_at >= $1
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [daysAgo]);

    // Get referrers
    const topReferrers = await db.all(`
      SELECT referrer, COUNT(DISTINCT session_id) as visitors
      FROM analytics_events
      WHERE referrer IS NOT NULL AND referrer != '' AND created_at >= $1
      GROUP BY referrer
      ORDER BY visitors DESC
      LIMIT 10
    `, [daysAgo]);

    // Key conversion events
    const conversions = await db.all(`
      SELECT event_type, COUNT(*) as count
      FROM analytics_events
      WHERE event_type IN ('design_created', 'add_to_cart', 'checkout_started', 'purchase_completed')
        AND created_at >= $1
      GROUP BY event_type
    `, [daysAgo]);

    // Landing → Design funnel (exclude null city + restricted cities from DB)
    const excludeCities = await getExcludeCitiesClause();
    const landingVisitors = await db.get(`
      SELECT COUNT(DISTINCT session_id) as count
      FROM analytics_events
      WHERE created_at >= $1 AND page_url = '/' ${excludeCities}
    `, [daysAgo]);

    const designVisitors = await db.get(`
      SELECT COUNT(DISTINCT session_id) as count
      FROM analytics_events
      WHERE created_at >= $1
        AND (page_url = '/design' OR event_type IN ('design_started', 'design_created'))
        ${excludeCities}
    `, [daysAgo]);

    const landingToDesignConverted = await db.get(`
      SELECT COUNT(*) as count FROM (
        SELECT session_id FROM analytics_events
        WHERE created_at >= $1 AND page_url = '/' ${excludeCities}
        INTERSECT
        SELECT session_id FROM analytics_events
        WHERE created_at >= $1
          AND (page_url = '/design' OR event_type IN ('design_started', 'design_created'))
          ${excludeCities}
      ) x
    `, [daysAgo]);

    const landingCount = parseInt(landingVisitors?.count || 0, 10);
    const convertedCount = parseInt(landingToDesignConverted?.count || 0, 10);
    const conversionRate = landingCount > 0
      ? Math.round((convertedCount / landingCount) * 1000) / 10
      : 0;

    res.json({
      summary: {
        unique_visitors: parseInt(uniqueVisitors?.count || 0),
        page_views: parseInt(pageViews?.count || 0),
        time_period_days: parseInt(days)
      },
      funnel: {
        landing_visitors: landingCount,
        design_visitors: parseInt(designVisitors?.count || 0, 10),
        landing_to_design_converted: convertedCount,
        landing_to_design_conversion_rate: conversionRate
      },
      events_by_type: eventsByType,
      visitors_by_country: visitorsByCountry,
      visitors_by_device: visitorsByDevice,
      visitors_by_browser: visitorsByBrowser,
      top_pages: topPages,
      daily_visitors: dailyVisitors,
      top_referrers: topReferrers,
      conversions: conversions
    });
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ error: 'Failed to get analytics summary' });
  }
});

// Get locations of converted users (landing → design), same exclusions as funnel
router.get('/funnel/converted-locations', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));
    const exclude = await getExcludeCitiesClause();

    const rows = await db.all(`
      WITH converted_sessions AS (
        SELECT session_id FROM analytics_events
        WHERE created_at >= $1 AND page_url = '/' ${exclude}
        INTERSECT
        SELECT session_id FROM analytics_events
        WHERE created_at >= $1
          AND (page_url = '/design' OR event_type IN ('design_started', 'design_created'))
          ${exclude}
      )
      SELECT
        e.country,
        e.city,
        e.region,
        e.device_type,
        COUNT(DISTINCT e.session_id) AS visitors,
        COUNT(*) AS events
      FROM analytics_events e
      INNER JOIN converted_sessions c ON c.session_id = e.session_id
      WHERE e.created_at >= $1 ${exclude}
      GROUP BY e.country, e.city, e.region, e.device_type
      ORDER BY visitors DESC
    `, [daysAgo]);

    const byKey = {};
    for (const r of rows) {
      const key = `${r.country}|${r.city || ''}|${r.region || ''}`;
      if (!byKey[key]) {
        byKey[key] = {
          country: r.country,
          city: r.city,
          region: r.region,
          visitors: 0,
          events: 0,
          devices: [],
        };
      }
      byKey[key].visitors += parseInt(r.visitors, 10);
      byKey[key].events += parseInt(r.events, 10);
      byKey[key].devices.push({
        device_type: r.device_type || 'unknown',
        visitors: parseInt(r.visitors, 10),
        events: parseInt(r.events, 10),
      });
    }

    const locations = Object.values(byKey).sort((a, b) => b.visitors - a.visitors);
    res.json(locations);
  } catch (error) {
    console.error('Converted locations error:', error);
    res.status(500).json({ error: 'Failed to get converted locations' });
  }
});

// Get recent events (for live feed)
router.get('/events', async (req, res) => {
  try {
    const { limit = 50, event_type } = req.query;

    let query = `
      SELECT id, event_type, event_data, page_url, country, city, device_type, browser, created_at
      FROM analytics_events
    `;
    const params = [];

    if (event_type) {
      query += ` WHERE event_type = $1`;
      params.push(event_type);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const events = await db.all(query, params);
    res.json(events);
  } catch (error) {
    console.error('Analytics events error:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// Get visitor details by location (with desktop/mobile/tablet per location)
router.get('/visitors/locations', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));

    // Group by location AND device_type to get desktop/mobile/tablet per location
    const rows = await db.all(`
      SELECT 
        country, 
        city, 
        region,
        device_type,
        COUNT(DISTINCT session_id) as visitors,
        COUNT(*) as events
      FROM analytics_events
      WHERE country IS NOT NULL AND created_at >= $1
      GROUP BY country, city, region, device_type
      ORDER BY country, city, region, visitors DESC
    `, [daysAgo]);

    // Aggregate by location, building devices array
    const byKey = {};
    for (const r of rows) {
      const key = `${r.country}|${r.city || ''}|${r.region || ''}`;
      if (!byKey[key]) {
        byKey[key] = {
          country: r.country,
          city: r.city,
          region: r.region,
          visitors: 0,
          events: 0,
          devices: [],
        };
      }
      byKey[key].visitors += parseInt(r.visitors, 10);
      byKey[key].events += parseInt(r.events, 10);
      byKey[key].devices.push({
        device_type: r.device_type || 'unknown',
        visitors: parseInt(r.visitors, 10),
        events: parseInt(r.events, 10),
      });
    }

    const locations = Object.values(byKey)
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 100);

    res.json(locations);
  } catch (error) {
    console.error('Analytics locations error:', error);
    res.status(500).json({ error: 'Failed to get locations' });
  }
});

// Get product page visits – each visit to /product/:designId with location, device, linked design
router.get('/product-visits', async (req, res) => {
  try {
    const { days = 30, limit = 100 } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));

    const rows = await db.all(`
      SELECT 
        e.id,
        e.event_data->>'design_id' AS design_id,
        e.page_url,
        e.country,
        e.city,
        e.region,
        e.device_type,
        e.browser,
        e.created_at,
        e.session_id,
        d.title AS design_title,
        d.design_image_url AS design_image_url,
        d.template_id AS design_template_id
      FROM analytics_events e
      LEFT JOIN designs d ON d.id::text = (e.event_data->>'design_id')
      WHERE e.event_type = 'product_page_viewed'
        AND e.event_data->>'design_id' IS NOT NULL
        AND e.created_at >= $1
      ORDER BY e.created_at DESC
      LIMIT $2
    `, [daysAgo, parseInt(limit)]);

    const visits = rows.map((r) => ({
      id: r.id,
      design_id: r.design_id,
      design_title: r.design_title,
      design_image_url: r.design_image_url,
      design_template_id: r.design_template_id,
      page_url: r.page_url,
      country: r.country,
      city: r.city,
      region: r.region,
      device_type: r.device_type,
      browser: r.browser,
      created_at: r.created_at,
      session_id: r.session_id,
    }));

    res.json(visits);
  } catch (error) {
    console.error('Analytics product-visits error:', error);
    res.status(500).json({ error: 'Failed to get product visits' });
  }
});

// Restricted cities (excluded from funnel; null cities always excluded)
router.get('/restricted-cities', async (req, res) => {
  try {
    const rows = await db.all('SELECT id, city FROM analytics_restricted_cities ORDER BY city');
    res.json(rows);
  } catch (error) {
    console.error('Restricted cities list error:', error);
    res.status(500).json({ error: 'Failed to list restricted cities' });
  }
});

router.post('/restricted-cities', async (req, res) => {
  try {
    const { city } = req.body;
    const c = String(city || '').trim();
    if (!c) return res.status(400).json({ error: 'City is required' });
    const lower = c.toLowerCase();
    try {
      await db.query('INSERT INTO analytics_restricted_cities (city) VALUES ($1)', [lower]);
    } catch (e) {
      if (e.code === '23505') {
        const row = await db.get('SELECT id, city FROM analytics_restricted_cities WHERE city = $1', [lower]);
        return res.status(200).json({ ...row, message: 'Already exists' });
      }
      throw e;
    }
    const row = await db.get('SELECT id, city FROM analytics_restricted_cities WHERE city = $1', [lower]);
    res.status(201).json(row);
  } catch (error) {
    console.error('Restricted cities add error:', error);
    res.status(500).json({ error: 'Failed to add restricted city' });
  }
});

router.delete('/restricted-cities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await db.query('DELETE FROM analytics_restricted_cities WHERE id = $1 RETURNING id', [id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (error) {
    console.error('Restricted cities delete error:', error);
    res.status(500).json({ error: 'Failed to delete restricted city' });
  }
});

module.exports = router;
