const express = require('express');
const router = express.Router();
const { getBalance, getLeaderboard } = require('../controllers/points.controller');
const { authMiddleware } = require('../middleware/auth');

// GET /api/points/balance - Solde de points
router.get('/balance', authMiddleware, getBalance);

// GET /api/points/leaderboard - Classement
router.get('/leaderboard', getLeaderboard);

module.exports = router;
