const express = require('express');
const router = express.Router();
const { getStats, getAllUsers, createUser, updateUser, deleteUser, updateMachine, deleteMachine } = require('../controllers/admin.controller');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET /api/admin/stats - Statistiques globales
router.get('/stats', authMiddleware, adminOnly, getStats);

// --- USERS CRUD ---
// GET /api/admin/users - Liste des utilisateurs
router.get('/users', authMiddleware, adminOnly, getAllUsers);

// POST /api/admin/users - Créer un utilisateur
router.post('/users', authMiddleware, adminOnly, createUser);

// PUT /api/admin/users/:id - Modifier un utilisateur
router.put('/users/:id', authMiddleware, adminOnly, updateUser);

// DELETE /api/admin/users/:id - Supprimer un utilisateur
router.delete('/users/:id', authMiddleware, adminOnly, deleteUser);

// --- MACHINES CRUD ---
// PUT /api/admin/machines/:id - Modifier une machine
router.put('/machines/:id', authMiddleware, adminOnly, updateMachine);

// DELETE /api/admin/machines/:id - Supprimer une machine
router.delete('/machines/:id', authMiddleware, adminOnly, deleteMachine);

module.exports = router;
