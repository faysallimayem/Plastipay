# ♻️ EcoCollect API

Système de collecte de bouteilles recyclables — Backend API

## 🚀 Démarrage rapide

### 1. Installer les dépendances
```bash
npm install
```

### 2. Initialiser la base de données
```bash
npm run db:push
```

### 3. Remplir avec des données de démo
```bash
npm run db:seed
```

### 4. Lancer le serveur
```bash
npm run dev
```

Le serveur démarre sur **http://localhost:3000**

## 📋 Comptes de test

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | admin@ecocollect.tn | admin123 |
| User | ahmed@test.tn | user123 |
| User | fatma@test.tn | user123 |
| User | youssef@test.tn | user123 |

## 🛣️ Endpoints API

### Auth
- `POST /api/auth/register` — Inscription
- `POST /api/auth/login` — Connexion
- `GET /api/auth/profile` — Profil (🔒 JWT)

### Transactions
- `POST /api/transactions` — Dépôt bouteilles (🔑 Machine API Key)
- `GET /api/transactions` — Historique (🔒 JWT)
- `GET /api/transactions/all` — Tout voir (🔒 Admin)

### Points
- `GET /api/points/balance` — Solde (🔒 JWT)
- `GET /api/points/leaderboard` — Classement

### Récompenses
- `GET /api/rewards` — Liste (🔒 JWT)
- `POST /api/rewards/redeem` — Échanger (🔒 JWT)
- `GET /api/rewards/history` — Historique (🔒 JWT)

### Machines
- `POST /api/machines` — Ajouter (🔒 Admin)
- `GET /api/machines` — Liste (🔒 Admin)
- `PATCH /api/machines/:id/status` — Modifier statut (🔒 Admin)

## 🔧 Scripts

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lancer en développement (nodemon) |
| `npm start` | Lancer en production |
| `npm run db:push` | Appliquer le schéma Prisma |
| `npm run db:seed` | Données de démo |
| `npm run db:studio` | Interface visuelle BDD |
| `npm run db:reset` | Réinitialiser la BDD |

## 🏗️ Technologies

- **Runtime** : Node.js
- **Framework** : Express.js
- **ORM** : Prisma
- **BDD** : SQLite (dev) / PostgreSQL (prod)
- **Auth** : JWT (jsonwebtoken + bcryptjs)
