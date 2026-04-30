const express = require('express');
const router = express.Router();
const { createMachine, getMachines, updateMachineStatus, startSession, getActiveSession, endSession, getMySession, getQRCode, getQRCodePrintPage } = require('../controllers/machine.controller');
const { authMiddleware, adminOnly, machineAuth } = require('../middleware/auth');
const { validateRequired } = require('../middleware/validate');

// POST /api/machines - Enregistrer une machine (admin)
router.post(
    '/',
    authMiddleware,
    adminOnly,
    validateRequired(['name', 'location', 'serialNumber']),
    createMachine
);

// GET /api/machines - Liste des machines (admin)
router.get('/', authMiddleware, adminOnly, getMachines);

// PATCH /api/machines/:id/status - Mettre à jour le statut (admin)
router.patch(
    '/:id/status',
    authMiddleware,
    adminOnly,
    validateRequired(['status']),
    updateMachineStatus
);

// ═══════════════════════════════════════════
// 📱 QR CODE ROUTES
// ═══════════════════════════════════════════

// GET /api/machines/:id/qr - Get QR code data (admin)
router.get('/:id/qr', authMiddleware, adminOnly, getQRCode);

// GET /api/machines/:id/qr/print - Printable QR sticker page (admin)
router.get('/:id/qr/print', authMiddleware, adminOnly, getQRCodePrintPage);

// ═══════════════════════════════════════════
// 🔗 SESSION ROUTES (QR Code → Machine link)
// ═══════════════════════════════════════════

// POST /api/machines/session - Start session (user scans QR code)
router.post(
    '/session',
    authMiddleware,
    validateRequired(['serialNumber']),
    startSession
);

// GET /api/machines/session/active - ESP32 polls for active session
router.get('/session/active', machineAuth, getActiveSession);

// GET /api/machines/session/me - Mobile app polls for session status
router.get('/session/me', authMiddleware, getMySession);

// DELETE /api/machines/session - End session (from mobile app)
router.delete('/session', authMiddleware, endSession);

module.exports = router;

