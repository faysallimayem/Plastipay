const prisma = require('../config/database');

/**
 * Statistiques globales pour le dashboard admin
 * GET /api/admin/stats
 */
const getStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalMachines,
      activeMachines,
      totalTransactions,
      bottlesStats,
      pointsStats,
      recentTransactions,
      topUsers,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'user' } }),
      prisma.machine.count(),
      prisma.machine.count({ where: { status: 'active' } }),
      prisma.transaction.count(),
      prisma.transaction.aggregate({
        _sum: { bottlesCount: true },
      }),
      prisma.transaction.aggregate({
        _sum: { pointsEarned: true },
      }),
      prisma.transaction.findMany({
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          machine: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.user.findMany({
        where: { role: 'user' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          totalPoints: true,
          _count: { select: { transactions: true } },
        },
        orderBy: { totalPoints: 'desc' },
        take: 5,
      }),
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalMachines,
          activeMachines,
          totalTransactions,
          totalBottles: bottlesStats._sum.bottlesCount || 0,
          totalPointsDistributed: pointsStats._sum.pointsEarned || 0,
        },
        recentTransactions,
        topUsers: topUsers.map((u) => ({
          ...u,
          totalDeposits: u._count.transactions,
        })),
      },
    });
  } catch (error) {
    console.error('Erreur stats admin:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

/**
 * Liste complète des utilisateurs (admin)
 * GET /api/admin/users
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        totalPoints: true,
        role: true,
        createdAt: true,
        _count: { select: { transactions: true, rewardRedemptions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: {
        users: users.map((u) => ({
          ...u,
          totalDeposits: u._count.transactions,
          totalRedemptions: u._count.rewardRedemptions,
        })),
      },
    });
  } catch (error) {
    console.error('Erreur liste users:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

/**
 * Créer un utilisateur (admin)
 * POST /api/admin/users
 */
const createUser = async (req, res) => {
  try {
    const { email, phone, password, firstName, lastName, role } = req.body;
    const bcrypt = require('bcryptjs');

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Cet email est déjà utilisé.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, phone: phone || null, passwordHash, firstName, lastName, role: role || 'user' },
    });

    res.status(201).json({
      success: true,
      message: 'Utilisateur créé ! 🎉',
      data: { user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role } },
    });
  } catch (error) {
    console.error('Erreur création user:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

/**
 * Modifier un utilisateur (admin)
 * PUT /api/admin/users/:id
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, phone, firstName, lastName, role, totalPoints, password } = req.body;

    const updateData = {};
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (role !== undefined) updateData.role = role;
    if (totalPoints !== undefined) updateData.totalPoints = parseInt(totalPoints);
    if (password) {
      const bcrypt = require('bcryptjs');
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: { id: true, email: true, phone: true, firstName: true, lastName: true, role: true, totalPoints: true },
    });

    res.json({ success: true, message: 'Utilisateur modifié ✅', data: { user } });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
    if (error.code === 'P2002') return res.status(409).json({ success: false, message: 'Email ou téléphone déjà utilisé.' });
    console.error('Erreur modification user:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

/**
 * Supprimer un utilisateur (admin)
 * DELETE /api/admin/users/:id
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    // Ne pas supprimer son propre compte
    if (userId === req.user.id) {
      return res.status(400).json({ success: false, message: 'Impossible de supprimer votre propre compte.' });
    }

    // Supprimer les données liées d'abord
    await prisma.rewardRedemption.deleteMany({ where: { userId } });
    await prisma.transaction.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });

    res.json({ success: true, message: 'Utilisateur supprimé 🗑️' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
    console.error('Erreur suppression user:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

/**
 * Modifier une machine (admin)
 * PUT /api/admin/machines/:id
 */
const updateMachine = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, serialNumber, status } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (location !== undefined) updateData.location = location;
    if (serialNumber !== undefined) updateData.serialNumber = serialNumber;
    if (status !== undefined) updateData.status = status;

    const machine = await prisma.machine.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    res.json({ success: true, message: 'Machine modifiée ✅', data: { machine } });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Machine non trouvée.' });
    if (error.code === 'P2002') return res.status(409).json({ success: false, message: 'Numéro de série déjà utilisé.' });
    console.error('Erreur modification machine:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

/**
 * Supprimer une machine (admin)
 * DELETE /api/admin/machines/:id
 */
const deleteMachine = async (req, res) => {
  try {
    const { id } = req.params;
    const machineId = parseInt(id);

    await prisma.transaction.deleteMany({ where: { machineId } });
    await prisma.machine.delete({ where: { id: machineId } });

    res.json({ success: true, message: 'Machine supprimée 🗑️' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Machine non trouvée.' });
    console.error('Erreur suppression machine:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

module.exports = { getStats, getAllUsers, createUser, updateUser, deleteUser, updateMachine, deleteMachine };
