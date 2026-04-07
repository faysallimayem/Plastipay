const prisma = require('../config/database');

/**
 * Solde de points de l'utilisateur connecté
 * GET /api/points/balance
 */
const getBalance = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                totalPoints: true,
                firstName: true,
                lastName: true,
            },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé.',
            });
        }

        // Statistiques supplémentaires
        const stats = await prisma.transaction.aggregate({
            where: { userId: req.user.id },
            _sum: { bottlesCount: true, pointsEarned: true },
            _count: { id: true },
        });

        const pointsSpent = await prisma.rewardRedemption.aggregate({
            where: { userId: req.user.id, status: 'completed' },
            _sum: { pointsSpent: true },
        });

        res.json({
            success: true,
            data: {
                balance: user.totalPoints,
                name: `${user.firstName} ${user.lastName}`,
                stats: {
                    totalBottlesRecycled: stats._sum.bottlesCount || 0,
                    totalPointsEarned: stats._sum.pointsEarned || 0,
                    totalPointsSpent: pointsSpent._sum.pointsSpent || 0,
                    totalDeposits: stats._count.id || 0,
                },
            },
        });
    } catch (error) {
        console.error('Erreur solde:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération du solde.',
        });
    }
};

/**
 * Classement des utilisateurs (leaderboard)
 * GET /api/points/leaderboard
 */
const getLeaderboard = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        const topUsers = await prisma.user.findMany({
            where: { role: 'user' },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                totalPoints: true,
                _count: {
                    select: { transactions: true },
                },
            },
            orderBy: { totalPoints: 'desc' },
            take: limit,
        });

        const leaderboard = topUsers.map((user, index) => ({
            rank: index + 1,
            name: `${user.firstName} ${user.lastName}`,
            totalPoints: user.totalPoints,
            totalDeposits: user._count.transactions,
        }));

        res.json({
            success: true,
            data: { leaderboard },
        });
    } catch (error) {
        console.error('Erreur classement:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération du classement.',
        });
    }
};

module.exports = { getBalance, getLeaderboard };
