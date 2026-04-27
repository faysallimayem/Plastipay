# ♻️ PlastiPay (formerly EcoCollect)

Système de collecte de bouteilles recyclables — Backend API & Fluter Application

PlastiPay is an ecosystem designed to reward plastic and glass bottle recycling in Tunisia. It features a scalable Node.js backend API, a modern Flutter-based web & mobile interface, and integration with ESP32 IoT machines.

## 🚀 Démarrage Rapide

### 1. Installer les dépendances
```bash
npm install
```

### 2. Variables d'environnement
Créez un fichier `.env` basé sur vos configurations:
- `DATABASE_URL` (Supabase PostgreSQL URL)
- `JWT_SECRET`
- `PORT` (par défaut 3000)

### 3. Initialiser la base de données
```bash
npm run db:push
```

### 4. Remplir avec des données de démo
```bash
npm run db:seed
```

### 5. Lancer le serveur
```bash
npm run dev
```

Le serveur démarre sur le port 3000 et sert à la fois le dashboard d'administration et l'application Flutter web.

### 🌐 Accès aux Interfaces (Local)

Une fois le serveur démarré, vous pouvez accéder aux interfaces via les URLs suivantes :

- **Dashboard Admistrateur** : [http://localhost:3000/](http://localhost:3000/)
- **Application Utilisateur (Flutter Web)** : [http://localhost:3000/app/](http://localhost:3000/app/)

## 🏢 Déploiement sur Render

Le projet est entièrement configuré pour être déployé sur **Render**.

1. **Backend & Dashboard**: Le service Node.js est publié à la racine. Le dashboard administrateur est accessible directement sur `/`.
2. **Flutter Web App**: Hébergée par le backend sous la route `/app/*`.
3. **Base de données**: Supabase (PostgreSQL) remplace SQLite en production.

**Note sur le Dashboard**: Une fois déployé sur Render, naviguez à l'URL principale de votre service Web pour afficher l'interface d'administration en ligne.

## 📋 Comptes de test

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | admin@ecocollect.tn | admin123 |
| User | ahmed@test.tn | user123 |
| User | fatma@test.tn | user123 |
| User | youssef@test.tn | user123 |

*(L'accès au Dashboard se fait via le compte administrateur ci-dessus. N'oubliez pas de changer ce mot de passe en production !)*

## 🛣️ Endpoints API Principaux

### Auth
- `POST /api/auth/register` — Inscription
- `POST /api/auth/login` — Connexion
- `GET /api/auth/profile` — Profil (🔒 JWT)

### Transactions
- `POST /api/transactions` — Dépôt bouteilles (🔑 Machine API Key - ESP32)
- `GET /api/transactions` — Historique utilisateur (🔒 JWT)
- `GET /api/transactions/all` — Tout voir (🔒 Admin)

### Points & Classement
- `GET /api/points/balance` — Solde (🔒 JWT)
- `GET /api/points/leaderboard` — Classement général

### Récompenses
- `GET /api/rewards` — Liste (🔒 JWT)
- `POST /api/rewards/redeem` — Échanger points contre récompense (🔒 JWT)
- `GET /api/rewards/history` — Historique des échanges (🔒 JWT)

### Machines (IoT)
- `POST /api/machines` — Ajouter une nouvelle machine (🔒 Admin)
- `GET /api/machines` — Liste des machines (🔒 Admin)
- `PATCH /api/machines/:id/status` — Modifier le statut de la machine (🔒 Admin)

## 🔧 Scripts Utiles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lancer le serveur en développement (Nodemon) |
| `npm start` | Lancer en production |
| `npm run db:push` | Appliquer le schéma Prisma à la BDD |
| `npm run db:seed` | Insérer des données de test |
| `npm run db:studio` | Interface graphique pour gérer la base de données |
| `npm run db:reset` | Réinitialiser la base de données entière |

## 🏗️ Technologies & Architecture

- **Backend** : Node.js avec Express.js
- **Frontend App** : Flutter (Web/Android)
- **Dashboard Admin** : HTML5, CSS3 vanille, Javascript
- **ORM** : Prisma
- **Base de données** : Supabase / PostgreSQL (Production) / SQLite (Développement local)
- **Authentification** : JWT (jsonwebtoken + bcryptjs)
- **IoT Hardware** : ESP32 intégré via API HTTP
