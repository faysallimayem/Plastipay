const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

/**
 * Inscription d'un nouvel utilisateur
 * POST /api/auth/register
 */
const register = async (req, res) => {
    try {
        const { email, phone, password, firstName, lastName } = req.body;

        // Vérifier si l'email existe déjà
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Cet email est déjà utilisé.',
            });
        }

        // Hasher le mot de passe
        const passwordHash = await bcrypt.hash(password, 10);

        // Créer l'utilisateur
        const user = await prisma.user.create({
            data: {
                email,
                phone: phone || null,
                passwordHash,
                firstName,
                lastName,
            },
        });

        // Générer le token JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'Inscription réussie ! 🎉',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    totalPoints: user.totalPoints,
                    role: user.role,
                },
                token,
            },
        });
    } catch (error) {
        console.error('Erreur inscription:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de l\'inscription.',
        });
    }
};

/**
 * Connexion d'un utilisateur
 * POST /api/auth/login
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Trouver l'utilisateur
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Email ou mot de passe incorrect.',
            });
        }

        // Vérifier le mot de passe
        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: 'Email ou mot de passe incorrect.',
            });
        }

        // Générer le token JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            success: true,
            message: 'Connexion réussie ! 👋',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    totalPoints: user.totalPoints,
                    role: user.role,
                },
                token,
            },
        });
    } catch (error) {
        console.error('Erreur connexion:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la connexion.',
        });
    }
};

/**
 * Profil de l'utilisateur connecté
 * GET /api/auth/profile
 */
const getProfile = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                phone: true,
                firstName: true,
                lastName: true,
                totalPoints: true,
                role: true,
                createdAt: true,
                _count: {
                    select: {
                        transactions: true,
                        rewardRedemptions: true,
                    },
                },
            },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé.',
            });
        }

        res.json({
            success: true,
            data: {
                ...user,
                totalTransactions: user._count.transactions,
                totalRedemptions: user._count.rewardRedemptions,
            },
        });
    } catch (error) {
        console.error('Erreur profil:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur.',
        });
    }
};

module.exports = { register, login, getProfile };
