const express = require('express');
const router = express.Router();
const { getRewards, redeemReward, getMyRedemptions } = require('../controllers/reward.controller');
const { authMiddleware } = require('../middleware/auth');
const { validateRequired } = require('../middleware/validate');

// GET /api/rewards - Liste des récompenses
router.get('/', authMiddleware, getRewards);

// POST /api/rewards/redeem - Échanger des points
router.post(
    '/redeem',
    authMiddleware,
    validateRequired(['rewardId']),
    redeemReward
);

// GET /api/rewards/history - Historique des échanges
router.get('/history', authMiddleware, getMyRedemptions);

module.exports = router;
