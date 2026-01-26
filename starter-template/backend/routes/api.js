const express = require('express');
const router = express.Router();

// Welcome endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'Welcome to your API!',
    version: '1.0.0',
    endpoints: {
      status: 'GET /api/status',
      hello: 'GET /api/hello'
    }
  });
});

// Status endpoint
router.get('/status', (req, res) => {
  res.json({
    status: 'online',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Hello endpoint (example)
router.get('/hello', (req, res) => {
  const name = req.query.name || 'World';
  res.json({
    message: `Hello, ${name}!`,
    timestamp: new Date().toISOString()
  });
});

// Example POST endpoint
router.post('/echo', (req, res) => {
  res.json({
    received: req.body,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
