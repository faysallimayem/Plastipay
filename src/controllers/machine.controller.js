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

/**
 * Get QR code data for a machine
 * GET /api/machines/:id/qr
 * Auth: Admin
 */
const getQRCode = async (req, res) => {
    try {
        const { id } = req.params;
        const machine = await prisma.machine.findUnique({
            where: { id: parseInt(id) },
            select: { id: true, name: true, location: true, serialNumber: true, status: true },
        });

        if (!machine) {
            return res.status(404).json({ success: false, message: 'Machine non trouvée.' });
        }

        // Build the app URL — use request origin or env var
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const baseUrl = process.env.APP_BASE_URL || `${protocol}://${host}`;
        const qrUrl = `${baseUrl}/app?machine=${machine.serialNumber}`;
        const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrUrl)}&bgcolor=ffffff&color=000000&margin=10`;

        res.json({
            success: true,
            data: {
                machine: {
                    id: machine.id,
                    name: machine.name,
                    location: machine.location,
                    serialNumber: machine.serialNumber,
                },
                qr: {
                    url: qrUrl,
                    imageUrl: qrImageUrl,
                },
            },
        });
    } catch (error) {
        console.error('Erreur QR code:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};

/**
 * Get a printable QR code sticker page for a machine
 * GET /api/machines/:id/qr/print
 * Auth: Admin
 */
const getQRCodePrintPage = async (req, res) => {
    try {
        const { id } = req.params;
        const machine = await prisma.machine.findUnique({
            where: { id: parseInt(id) },
            select: { id: true, name: true, location: true, serialNumber: true },
        });

        if (!machine) {
            return res.status(404).json({ success: false, message: 'Machine non trouvée.' });
        }

        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const baseUrl = process.env.APP_BASE_URL || `${protocol}://${host}`;
        const qrUrl = `${baseUrl}/app?machine=${machine.serialNumber}`;
        const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrUrl)}&bgcolor=ffffff&color=000000&margin=10`;

        const html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QR Code — ${machine.name}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', sans-serif;
            background: #f0f2f5;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }
        .sticker {
            width: 360px;
            background: white;
            border-radius: 28px;
            padding: 36px 32px 28px;
            box-shadow: 0 8px 40px rgba(0,0,0,0.1);
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        .sticker::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 6px;
            background: linear-gradient(90deg, #16A34A, #22C55E, #4ADE80);
        }
        .brand {
            font-size: 24px;
            font-weight: 800;
            color: #1a1a2e;
            margin-bottom: 2px;
        }
        .brand span { color: #22C55E; }
        .tagline {
            font-size: 11px;
            color: #94A3B8;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            margin-bottom: 20px;
        }
        .qr-container {
            background: white;
            border: 3px solid #E2E8F0;
            border-radius: 20px;
            padding: 16px;
            display: inline-block;
            margin-bottom: 20px;
        }
        .qr-container img {
            display: block;
            width: 220px;
            height: 220px;
        }
        .scan-label {
            font-size: 15px;
            font-weight: 700;
            color: #1a1a2e;
            margin-bottom: 4px;
        }
        .scan-sub {
            font-size: 12px;
            color: #64748B;
            margin-bottom: 20px;
        }
        .machine-info {
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 14px;
            padding: 14px 18px;
            margin-bottom: 14px;
        }
        .machine-name {
            font-size: 16px;
            font-weight: 700;
            color: #1a1a2e;
        }
        .machine-location {
            font-size: 12px;
            color: #64748B;
            margin-top: 2px;
        }
        .serial {
            font-family: 'Courier New', monospace;
            font-size: 13px;
            font-weight: 700;
            color: #22C55E;
            background: #F0FDF4;
            border: 1px solid #BBF7D0;
            border-radius: 8px;
            padding: 6px 14px;
            display: inline-block;
        }
        .footer {
            margin-top: 16px;
            font-size: 10px;
            color: #94A3B8;
        }
        @media print {
            body { background: white; padding: 0; }
            .sticker { box-shadow: none; border: 2px solid #E2E8F0; }
            .no-print { display: none; }
        }
        .btn-print {
            margin-top: 24px;
            padding: 12px 32px;
            background: #22C55E;
            color: white;
            border: none;
            border-radius: 12px;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
        }
        .btn-print:hover { background: #16A34A; }
    </style>
</head>
<body>
    <div>
        <div class="sticker">
            <div class="brand">♻️ Plasti<span>Pay</span></div>
            <div class="tagline">Plastic Pays, Planet Wins</div>
            <div class="qr-container">
                <img src="${qrImageUrl}" alt="QR Code ${machine.serialNumber}">
            </div>
            <div class="scan-label">📱 Scannez pour recycler</div>
            <div class="scan-sub">Ouvrez votre caméra et scannez ce QR code</div>
            <div class="machine-info">
                <div class="machine-name">🏭 ${machine.name}</div>
                <div class="machine-location">📍 ${machine.location}</div>
            </div>
            <div class="serial">${machine.serialNumber}</div>
            <div class="footer">plastipay.tn — Système de recyclage intelligent</div>
        </div>
        <div class="no-print" style="text-align:center">
            <button class="btn-print" onclick="window.print()">🖨️ Imprimer le sticker</button>
        </div>
    </div>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (error) {
        console.error('Erreur QR print page:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};

module.exports = { createMachine, getMachines, updateMachineStatus, startSession, getActiveSession, endSession, getMySession, getQRCode, getQRCodePrintPage };
