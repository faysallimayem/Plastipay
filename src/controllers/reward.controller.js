const prisma = require('../config/database');

/**
 * Liste des récompenses disponibles
 * GET /api/rewards
 */
const getRewards = async (req, res) => {
    try {
        const rewards = await prisma.reward.findMany({
            where: { isActive: true },
            orderBy: { pointsCost: 'asc' },
        });

        // Ajouter si l'utilisateur peut se permettre chaque récompense
        let userPoints = 0;
        if (req.user) {
            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
                select: { totalPoints: true },
            });
            userPoints = user?.totalPoints || 0;
        }

        const rewardsWithStatus = rewards.map((reward) => ({
            ...reward,
            canRedeem: userPoints >= reward.pointsCost,
            pointsNeeded: Math.max(0, reward.pointsCost - userPoints),
        }));

        res.json({
            success: true,
            data: {
                rewards: rewardsWithStatus,
                userPoints,
            },
        });
    } catch (error) {
        console.error('Erreur récompenses:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des récompenses.',
        });
    }
};

/**
 * Échanger des points contre une récompense
 * POST /api/rewards/redeem
 */
const redeemReward = async (req, res) => {
    try {
        const { rewardId } = req.body;
        const userId = req.user.id;

        // Vérifier la récompense
        const reward = await prisma.reward.findUnique({
            where: { id: rewardId },
        });

        if (!reward || !reward.isActive) {
            return res.status(404).json({
                success: false,
                message: 'Récompense non trouvée ou inactive.',
            });
        }

        // Vérifier les points de l'utilisateur
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (user.totalPoints < reward.pointsCost) {
            return res.status(400).json({
                success: false,
                message: `Points insuffisants. Il vous manque ${reward.pointsCost - user.totalPoints} points.`,
                data: {
                    currentPoints: user.totalPoints,
                    requiredPoints: reward.pointsCost,
                    missing: reward.pointsCost - user.totalPoints,
                },
            });
        }

        // Créer l'échange et déduire les points
        const [redemption, updatedUser] = await prisma.$transaction([
            prisma.rewardRedemption.create({
                data: {
                    userId,
                    rewardId,
                    pointsSpent: reward.pointsCost,
                    status: 'pending',
                },
            }),
            prisma.user.update({
                where: { id: userId },
                data: { totalPoints: { decrement: reward.pointsCost } },
            }),
        ]);

        res.status(201).json({
            success: true,
            message: `🎁 Récompense "${reward.name}" obtenue !`,
            data: {
                redemption: {
                    id: redemption.id,
                    reward: reward.name,
                    pointsSpent: redemption.pointsSpent,
                    status: redemption.status,
                },
                remainingPoints: updatedUser.totalPoints,
            },
        });
    } catch (error) {
        console.error('Erreur échange:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'échange.',
        });
    }
};

/**
 * Historique des échanges de l'utilisateur
 * GET /api/rewards/history
 */
const getMyRedemptions = async (req, res) => {
    try {
        const redemptions = await prisma.rewardRedemption.findMany({
            where: { userId: req.user.id },
            include: {
                reward: {
                    select: { name: true, description: true, category: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json({
            success: true,
            data: { redemptions },
        });
    } catch (error) {
        console.error('Erreur historique échanges:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur.',
        });
    }
};

module.exports = { getRewards, redeemReward, getMyRedemptions };
