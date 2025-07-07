import express from 'express';

const router = express.Router();

// Debug endpoint to check session
router.get('/session', (req, res) => {
  res.json({
    session: req.session,
    cookies: req.cookies,
    headers: req.headers
  });
});

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

export default router; 