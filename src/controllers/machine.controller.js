const prisma = require('../config/database');
const crypto = require('crypto');

/**
 * Enregistrer une nouvelle machine (admin seulement)
 * POST /api/machines
 */
const createMachine = async (req, res) => {
    try {
        const { name, location, serialNumber } = req.body;

        // Vérifier si le numéro de série existe
        const existing = await prisma.machine.findUnique({
            where: { serialNumber },
        });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: 'Ce numéro de série est déjà enregistré.',
            });
        }

        // Générer une clé API unique
        const apiKey = `eco_${crypto.randomBytes(24).toString('hex')}`;

        const machine = await prisma.machine.create({
            data: {
                name,
                location,
                serialNumber,
                apiKey,
                status: 'active',
            },
        });

        res.status(201).json({
            success: true,
            message: 'Machine enregistrée ! 🏭',
            data: {
                machine: {
                    id: machine.id,
                    name: machine.name,
                    location: machine.location,
                    serialNumber: machine.serialNumber,
                    apiKey: machine.apiKey, // Afficher une seule fois !
                    status: machine.status,
                },
            },
        });
    } catch (error) {
        console.error('Erreur création machine:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'enregistrement de la machine.',
        });
    }
};

/**
 * Liste des machines
 * GET /api/machines
 */
const getMachines = async (req, res) => {
    try {
        const machines = await prisma.machine.findMany({
            select: {
                id: true,
                name: true,
                location: true,
                serialNumber: true,
                status: true,
                lastPing: true,
                createdAt: true,
                _count: {
                    select: { transactions: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const machinesWithStats = machines.map((m) => ({
            ...m,
            totalDeposits: m._count.transactions,
        }));

        res.json({
            success: true,
            data: { machines: machinesWithStats },
        });
    } catch (error) {
        console.error('Erreur liste machines:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur.',
        });
    }
};

/**
 * Mettre à jour le statut d'une machine (admin)
 * PATCH /api/machines/:id/status
 */
const updateMachineStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['active', 'maintenance', 'offline'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Statut invalide. Valeurs acceptées : ${validStatuses.join(', ')}`,
            });
        }

        const machine = await prisma.machine.update({
            where: { id: parseInt(id) },
            data: { status },
        });

        res.json({
            success: true,
            message: `Machine "${machine.name}" → ${status}`,
            data: { machine },
        });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({
                success: false,
                message: 'Machine non trouvée.',
            });
        }
        console.error('Erreur mise à jour machine:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur.',
        });
    }
};

/**
 * Start a session: user scans QR code on machine
 * POST /api/machines/session
 * Auth: JWT (user)
 * Body: { serialNumber }
 */
const startSession = async (req, res) => {
    try {
        const { serialNumber } = req.body;
        const userId = req.user.id;

        // Find the machine by serial number
        const machine = await prisma.machine.findUnique({
            where: { serialNumber },
        });

        if (!machine) {
            return res.status(404).json({
                success: false,
                message: 'Machine non trouvée. Vérifiez le QR code.',
            });
        }

        if (machine.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: `Machine ${machine.status}. Contactez l'administrateur.`,
            });
        }

        // Get user info
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
        }

        const SessionStore = require('../config/session.store');
        
        // Block if another user is already using this machine
        const activeSession = SessionStore.getByMachine(machine.id);
        if (activeSession && activeSession.userId !== user.id) {
            return res.status(409).json({
                success: false,
                message: 'Cette machine est actuellement utilisée par quelqu\'un d\'autre.',
            });
        }

        // Start session
        const session = SessionStore.start(
            machine.id,
            user.id,
            user.firstName,
            user.lastName,
            user.totalPoints
        );

        // Update machine last ping
        await prisma.machine.update({
            where: { id: machine.id },
            data: { lastPing: new Date() },
        });

        res.json({
            success: true,
            message: `Connecté à ${machine.name} ! 🏭`,
            data: {
                session: {
                    machineId: machine.id,
                    machineName: machine.name,
                    machineLocation: machine.location,
                    userPoints: user.totalPoints,
                    startedAt: session.startedAt,
                },
            },
        });
    } catch (error) {
        console.error('Erreur start session:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};

/**
 * Get active session for a machine (ESP32 polls this)
 * GET /api/machines/session/active
 * Auth: Machine API key
 */
const getActiveSession = async (req, res) => {
    try {
        const machineId = req.machine.id;
        const SessionStore = require('../config/session.store');
        const session = SessionStore.getByMachine(machineId);

        if (!session) {
            return res.json({
                success: true,
                data: { session: null },
            });
        }

        // Get fresh user points from DB
        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { totalPoints: true },
        });

        if (user) {
            session.userPoints = user.totalPoints;
        }

        res.json({
            success: true,
            data: {
                session: {
                    userId: session.userId,
                    firstName: session.userFirstName,
                    lastName: session.userLastName,
                    totalPoints: session.userPoints,
                    bottlesThisSession: session.bottlesThisSession,
                    pointsThisSession: session.pointsThisSession,
                    startedAt: session.startedAt,
                },
            },
        });
    } catch (error) {
        console.error('Erreur get session:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};

/**
 * End session (from mobile app)
 * DELETE /api/machines/session
 * Auth: JWT (user)
 */
const endSession = async (req, res) => {
    try {
        const userId = req.user.id;
        const SessionStore = require('../config/session.store');
        const session = SessionStore.endByUser(userId);

        if (!session) {
            return res.json({
                success: true,
                message: 'Aucune session active.',
                data: { session: null },
            });
        }

        res.json({
            success: true,
            message: `Session terminée ! ${session.bottlesThisSession} bouteilles, +${session.pointsThisSession} pts 🎉`,
            data: {
                summary: {
                    bottlesDeposited: session.bottlesThisSession,
                    pointsEarned: session.pointsThisSession,
                    totalPoints: session.userPoints,
                },
            },
        });
    } catch (error) {
        console.error('Erreur end session:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};

/**
 * Get user's active session status (mobile app polls this)
 * GET /api/machines/session/me
 * Auth: JWT (user)
 */
const getMySession = async (req, res) => {
    try {
        const userId = req.user.id;
        const SessionStore = require('../config/session.store');
        const session = SessionStore.getByUser(userId);

        if (!session) {
            return res.json({ success: true, data: { session: null } });
        }

        // Get fresh points
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { totalPoints: true },
        });

        const machine = await prisma.machine.findUnique({
            where: { id: session.machineId },
            select: { name: true, location: true },
        });

        res.json({
            success: true,
            data: {
                session: {
                    machineId: session.machineId,
                    machineName: machine?.name || 'Machine',
                    machineLocation: machine?.location || '',
                    totalPoints: user?.totalPoints || session.userPoints,
                    bottlesThisSession: session.bottlesThisSession,
                    pointsThisSession: session.pointsThisSession,
                    startedAt: session.startedAt,
                },
            },
        });
    } catch (error) {
        console.error('Erreur my session:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};

module.exports = { createMachine, getMachines, updateMachineStatus, startSession, getActiveSession, endSession, getMySession };
