const prisma = require('../config/database');

/**
 * Créer une transaction (dépôt de bouteilles)
 * POST /api/transactions
 * Appelé par la machine (authentifié via API key)
 */
const createTransaction = async (req, res) => {
    try {
        const { userId, bottlesCount, bottleType } = req.body;
        const machineId = req.machine.id;

        // Vérifier l'utilisateur
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé.',
            });
        }

        // Calculer les points
        const pointsPerBottle = bottleType === 'glass'
            ? parseInt(process.env.POINTS_GLASS) || 15
            : parseInt(process.env.POINTS_PLASTIC) || 10;
        const pointsEarned = bottlesCount * pointsPerBottle;

        // Créer la transaction et mettre à jour les points en une seule opération
        const [transaction, updatedUser] = await prisma.$transaction([
            prisma.transaction.create({
                data: {
                    userId,
                    machineId,
                    bottlesCount,
                    bottleType: bottleType || 'plastic',
                    pointsEarned,
                },
            }),
            prisma.user.update({
                where: { id: userId },
                data: { totalPoints: { increment: pointsEarned } },
            }),
        ]);

        // Update session store so ESP32 sees new points immediately
        const SessionStore = require('../config/session.store');
        SessionStore.updatePoints(machineId, updatedUser.totalPoints, pointsEarned);

        res.status(201).json({
            success: true,
            message: `+${pointsEarned} points ! 🎉`,
            data: {
                transaction: {
                    id: transaction.id,
                    bottlesCount: transaction.bottlesCount,
                    bottleType: transaction.bottleType,
                    pointsEarned: transaction.pointsEarned,
                    createdAt: transaction.createdAt,
                },
                user: {
                    id: updatedUser.id,
                    totalPoints: updatedUser.totalPoints,
                },
            },
        });
    } catch (error) {
        console.error('Erreur transaction:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'enregistrement du dépôt.',
        });
    }
};

/**
 * Historique des transactions de l'utilisateur connecté
 * GET /api/transactions
 */
const getMyTransactions = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where: { userId: req.user.id },
                include: {
                    machine: {
                        select: { name: true, location: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.transaction.count({ where: { userId: req.user.id } }),
        ]);

        res.json({
            success: true,
            data: {
                transactions,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            },
        });
    } catch (error) {
        console.error('Erreur historique:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération de l\'historique.',
        });
    }
};

/**
 * Toutes les transactions (admin seulement)
 * GET /api/transactions/all
 */
const getAllTransactions = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                include: {
                    user: {
                        select: { firstName: true, lastName: true, email: true },
                    },
                    machine: {
                        select: { name: true, location: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.transaction.count(),
        ]);

        res.json({
            success: true,
            data: {
                transactions,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            },
        });
    } catch (error) {
        console.error('Erreur admin transactions:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur.',
        });
    }
};

module.exports = { createTransaction, getMyTransactions, getAllTransactions };
