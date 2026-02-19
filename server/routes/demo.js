import express from 'express';
const router = express.Router();

router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Demo API is working!' });
});

export default router;
