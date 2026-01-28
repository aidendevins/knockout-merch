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

// Time on site metrics (calculated from event timestamps)
router.get('/time-metrics', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));

    // Average session duration (first to last event per session)
    const avgSessionDuration = await db.get(`
      SELECT AVG(duration) as avg_seconds
      FROM (
        SELECT 
          session_id,
          EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) as duration
        FROM analytics_events
        WHERE created_at >= $1 AND session_id IS NOT NULL
        GROUP BY session_id
        HAVING COUNT(*) > 1
      ) sessions
    `, [daysAgo]);

    // Average time per page (time between consecutive page_view events)
    const avgPageDuration = await db.get(`
      SELECT AVG(duration) as avg_seconds
      FROM (
        SELECT 
          session_id,
          page_url,
          EXTRACT(EPOCH FROM (
            LEAD(created_at) OVER (PARTITION BY session_id ORDER BY created_at) - created_at
          )) as duration
        FROM analytics_events
        WHERE event_type = 'page_view' AND created_at >= $1
      ) page_times
      WHERE duration IS NOT NULL AND duration > 0 AND duration < 3600
    `, [daysAgo]);

    // Top pages by average time spent
    const topPagesByTime = await db.all(`
      SELECT 
        page_url,
        COUNT(*) as views,
        AVG(duration) as avg_seconds,
        SUM(duration) as total_seconds
      FROM (
        SELECT 
          session_id,
          page_url,
          EXTRACT(EPOCH FROM (
            LEAD(created_at) OVER (PARTITION BY session_id ORDER BY created_at) - created_at
          )) as duration
        FROM analytics_events
        WHERE event_type = 'page_view' AND created_at >= $1
      ) page_times
      WHERE duration IS NOT NULL AND duration > 0 AND duration < 3600
      GROUP BY page_url
      HAVING COUNT(*) >= 3
      ORDER BY avg_seconds DESC
      LIMIT 10
    `, [daysAgo]);

    // Session duration buckets
    const sessionBuckets = await db.all(`
      SELECT 
        bucket,
        COUNT(*) as sessions
      FROM (
        SELECT 
          session_id,
          CASE 
            WHEN EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) < 30 THEN '0-30s'
            WHEN EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) < 60 THEN '30s-1m'
            WHEN EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) < 300 THEN '1-5m'
            WHEN EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) < 600 THEN '5-10m'
            WHEN EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) < 1800 THEN '10-30m'
            ELSE '30m+'
          END as bucket
        FROM analytics_events
        WHERE created_at >= $1 AND session_id IS NOT NULL
        GROUP BY session_id
        HAVING COUNT(*) > 1
      ) session_durations
      GROUP BY bucket
      ORDER BY 
        CASE bucket
          WHEN '0-30s' THEN 1
          WHEN '30s-1m' THEN 2
          WHEN '1-5m' THEN 3
          WHEN '5-10m' THEN 4
          WHEN '10-30m' THEN 5
          ELSE 6
        END
    `, [daysAgo]);

    res.json({
      avg_session_duration_seconds: parseFloat(avgSessionDuration?.avg_seconds || 0),
      avg_page_duration_seconds: parseFloat(avgPageDuration?.avg_seconds || 0),
      top_pages_by_time: topPagesByTime.map(p => ({
        page_url: p.page_url,
        views: parseInt(p.views),
        avg_seconds: parseFloat(p.avg_seconds),
        total_seconds: parseFloat(p.total_seconds)
      })),
      session_duration_buckets: sessionBuckets
    });
  } catch (error) {
    console.error('Time metrics error:', error);
    res.status(500).json({ error: 'Failed to get time metrics' });
  }
});

// Time distribution for a specific page
router.get('/time-distribution', async (req, res) => {
  try {
    const { page_url, days = 30 } = req.query;
    if (!page_url) {
      return res.status(400).json({ error: 'page_url is required' });
    }

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));

    // Get time distribution buckets for specific page
    const distribution = await db.all(`
      SELECT 
        bucket,
        COUNT(*) as views
      FROM (
        SELECT 
          CASE 
            WHEN duration < 10 THEN '0-10s'
            WHEN duration < 30 THEN '10-30s'
            WHEN duration < 60 THEN '30s-1m'
            WHEN duration < 120 THEN '1-2m'
            WHEN duration < 300 THEN '2-5m'
            WHEN duration < 600 THEN '5-10m'
            ELSE '10m+'
          END as bucket,
          duration
        FROM (
          SELECT 
            session_id,
            page_url,
            EXTRACT(EPOCH FROM (
              LEAD(created_at) OVER (PARTITION BY session_id ORDER BY created_at) - created_at
            )) as duration
          FROM analytics_events
          WHERE event_type = 'page_view' 
            AND created_at >= $1
            AND page_url = $2
        ) page_times
        WHERE duration IS NOT NULL AND duration > 0 AND duration < 3600
      ) bucketed
      GROUP BY bucket
      ORDER BY 
        CASE bucket
          WHEN '0-10s' THEN 1
          WHEN '10-30s' THEN 2
          WHEN '30s-1m' THEN 3
          WHEN '1-2m' THEN 4
          WHEN '2-5m' THEN 5
          WHEN '5-10m' THEN 6
          ELSE 7
        END
    `, [daysAgo, page_url]);

    res.json({
      page_url,
      distribution: distribution.map(d => ({
        bucket: d.bucket,
        views: parseInt(d.views)
      }))
    });
  } catch (error) {
    console.error('Time distribution error:', error);
    res.status(500).json({ error: 'Failed to get time distribution' });
  }
});

module.exports = router;
