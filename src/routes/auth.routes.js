const express = require('express');
const router = express.Router();
const { register, login, getProfile, uploadProfilePhoto, upload } = require('../controllers/auth.controller');
const { authMiddleware } = require('../middleware/auth');
const { validateRequired, validateEmail, validatePassword } = require('../middleware/validate');

// POST /api/auth/register - Inscription
router.post(
    '/register',
    validateRequired(['email', 'password', 'firstName', 'lastName']),
    validateEmail,
    validatePassword,
    register
);

// POST /api/auth/login - Connexion
router.post(
    '/login',
    validateRequired(['email', 'password']),
    login
);

// GET /api/auth/profile - Profil (protégé)
router.get('/profile', authMiddleware, getProfile);

// POST /api/auth/profile/photo - Upload profile photo (protégé)
router.post('/profile/photo', authMiddleware, upload.single('photo'), uploadProfilePhoto);

module.exports = router;
