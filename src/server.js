require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads', 'profiles');
fs.mkdirSync(uploadsDir, { recursive: true });

// ═══════════════════════════════════════════
// 🔧 Middleware
// ═══════════════════════════════════════════
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques du dashboard
app.use(express.static(path.join(__dirname, 'public')));

// Servir les uploads (photos de profil, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Logger simple pour le développement
app.use((req, res, next) => {
    const now = new Date().toLocaleTimeString('fr-TN');
    console.log(`[${now}] ${req.method} ${req.url}`);
    next();
});

// ═══════════════════════════════════════════
// 🛣️ Routes
// ═══════════════════════════════════════════
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/transactions', require('./routes/transaction.routes'));
app.use('/api/points', require('./routes/points.routes'));
app.use('/api/rewards', require('./routes/reward.routes'));
app.use('/api/machines', require('./routes/machine.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

// ═══════════════════════════════════════════
// 🏠 Route d'accueil
// ═══════════════════════════════════════════
app.get('/api', (req, res) => {
    res.json({
        name: '♻️ PlastiPay Tunisia API',
        version: '1.0.0',
        description: 'Plastic Pays, Planet Wins — Recyclage Tunisie',
        status: 'running',
    });
});

// ═══════════════════════════════════════════
// 📱 Flutter Web App (user-facing)
// ═══════════════════════════════════════════
const flutterAppPath = path.join(__dirname, '..', 'plastipay_app', 'build', 'web');
app.use('/app', express.static(flutterAppPath));
app.get('/app/*', (req, res) => {
    res.sendFile(path.join(flutterAppPath, 'index.html'));
});

// ═══════════════════════════════════════════
// ❌ Route 404
// ═══════════════════════════════════════════
app.use('*', (req, res) => {
    // If accessing root, redirect to admin dashboard
    if (req.originalUrl === '/') {
        return res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} non trouvée.`,
    });
});

// ═══════════════════════════════════════════
// 🚨 Gestion des erreurs globale
// ═══════════════════════════════════════════
app.use((err, req, res, next) => {
    console.error('💥 Erreur serveur:', err);
    res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur.',
    });
});

// ═══════════════════════════════════════════
// 🚀 Démarrage du serveur
// ═══════════════════════════════════════════
app.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('  ♻️  PlastiPay Tunisia API');
    console.log('  Plastic Pays, Planet Wins');
    console.log('═══════════════════════════════════════════');
    console.log(`  🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`  🌍 Dashboard: http://localhost:${PORT}`);
    console.log(`  📚 API: http://localhost:${PORT}/api`);
    console.log(`  🔧 Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log('═══════════════════════════════════════════');
    console.log('');
});
