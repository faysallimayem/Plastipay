const jwt = require('jsonwebtoken');

/**
 * Middleware d'authentification JWT
 * Vérifie le token dans le header Authorization
 */
const authMiddleware = (req, res, next) => {
    try {
        // Récupérer le token du header ou du query param (pour les pages ouvertes dans un nouvel onglet)
        const authHeader = req.headers.authorization;
        let token = null;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else if (req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Accès refusé. Token manquant.',
            });
        }

        // Vérifier le token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Token invalide ou expiré.',
        });
    }
};

/**
 * Middleware pour vérifier le rôle admin
 */
const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Accès refusé. Réservé aux administrateurs.',
        });
    }
    next();
};

/**
 * Middleware pour authentifier les machines (via API key)
 */
const machineAuth = async (req, res, next) => {
    try {
        const apiKey = req.headers['x-machine-api-key'];
        if (!apiKey) {
            return res.status(401).json({
                success: false,
                message: 'Clé API machine manquante.',
            });
        }

        const prisma = require('../config/database');
        const machine = await prisma.machine.findUnique({
            where: { apiKey },
        });

        if (!machine) {
            return res.status(401).json({
                success: false,
                message: 'Machine non reconnue.',
            });
        }

        if (machine.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: `Machine ${machine.status}. Contactez l'administrateur.`,
            });
        }

        // Mettre à jour le dernier ping
        await prisma.machine.update({
            where: { id: machine.id },
            data: { lastPing: new Date() },
        });

        req.machine = machine;
        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Erreur d\'authentification machine.',
        });
    }
};

module.exports = { authMiddleware, adminOnly, machineAuth };
