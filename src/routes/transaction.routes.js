const express = require('express');
const router = express.Router();
const { createTransaction, getMyTransactions, getAllTransactions } = require('../controllers/transaction.controller');
const { authMiddleware, adminOnly, machineAuth } = require('../middleware/auth');
const { validateRequired } = require('../middleware/validate');

// POST /api/transactions - Créer un dépôt (depuis la machine)
router.post(
    '/',
    machineAuth,
    validateRequired(['userId', 'bottlesCount']),
    createTransaction
);

// GET /api/transactions - Historique de l'utilisateur
router.get('/', authMiddleware, getMyTransactions);

// GET /api/transactions/all - Toutes les transactions (admin)
router.get('/all', authMiddleware, adminOnly, getAllTransactions);

module.exports = router;
