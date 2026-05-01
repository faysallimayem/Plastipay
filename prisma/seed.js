const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding de la base de données...\n');

  // --- Créer un admin ---
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ecocollect.tn' },
    update: {},
    create: {
      email: 'admin@ecocollect.tn',
      phone: '+21612345678',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'EcoCollect',
      role: 'admin',
      totalPoints: 0,
    },
  });
  console.log('✅ Admin créé:', admin.email);

  // --- Créer des utilisateurs test ---
  const userPassword = await bcrypt.hash('user123', 10);
  const users = [];
  const usersData = [
    { email: 'ahmed@test.tn', phone: '+21698765432', firstName: 'Ahmed', lastName: 'Ben Ali' },
    { email: 'fatma@test.tn', phone: '+21655443322', firstName: 'Fatma', lastName: 'Trabelsi' },
    { email: 'youssef@test.tn', phone: '+21611223344', firstName: 'Youssef', lastName: 'Khelifi' },
  ];

  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        ...u,
        passwordHash: userPassword,
        role: 'user',
        totalPoints: 0,
      },
    });
    users.push(user);
    console.log('✅ Utilisateur créé:', user.email);
  }

  // --- Créer des machines ---
  const machines = [];
  const machinesData = [
    { name: 'Machine Cafétéria', location: 'Cafétéria principale - RDC', serialNumber: 'ECO-TN-001', apiKey: 'machine_key_001_secret' },
    { name: 'Machine Bibliothèque', location: 'Bibliothèque - 1er étage', serialNumber: 'ECO-TN-002', apiKey: 'machine_key_002_secret' },
  ];

  for (const m of machinesData) {
    const machine = await prisma.machine.upsert({
      where: { serialNumber: m.serialNumber },
      update: {},
      create: {
        ...m,
        status: 'active',
        lastPing: new Date(),
      },
    });
    machines.push(machine);
    console.log('✅ Machine créée:', machine.name);
  }

  // --- Créer des récompenses ---
  const rewardsData = [
    { name: 'Café Gratuit', description: 'Un café offert — présentez le code au barista', pointsCost: 250, category: 'coffee' },
    { name: 'Soda Gratuit', description: 'Un soda offert — présentez le code au barista', pointsCost: 300, category: 'drink' },
    { name: 'Jus Gratuit', description: 'Un jus de fruits offert — présentez le code au barista', pointsCost: 350, category: 'drink' },
    { name: 'Thé Glacé Gratuit', description: 'Un thé glacé offert — présentez le code au barista', pointsCost: 400, category: 'drink' },
    { name: 'Glace Gratuite', description: 'Une glace offerte — présentez le code au barista', pointsCost: 450, category: 'gift' },
    { name: 'Sandwich Gratuit', description: 'Un sandwich offert — présentez le code au barista', pointsCost: 500, category: 'gift' },
  ];

  for (const r of rewardsData) {
    await prisma.reward.upsert({
      where: { id: rewardsData.indexOf(r) + 1 },
      update: {},
      create: {
        ...r,
        isActive: true,
      },
    });
    console.log('✅ Récompense créée:', r.name);
  }

  // --- Créer des transactions de démo ---
  const transactionsData = [
    { userId: users[0].id, machineId: machines[0].id, bottlesCount: 3, bottleType: 'plastic', pointsEarned: 30 },
    { userId: users[0].id, machineId: machines[1].id, bottlesCount: 2, bottleType: 'glass', pointsEarned: 30 },
    { userId: users[1].id, machineId: machines[0].id, bottlesCount: 5, bottleType: 'plastic', pointsEarned: 50 },
    { userId: users[2].id, machineId: machines[0].id, bottlesCount: 1, bottleType: 'plastic', pointsEarned: 10 },
  ];

  for (const t of transactionsData) {
    await prisma.transaction.create({ data: t });
    // Mettre à jour les points
    await prisma.user.update({
      where: { id: t.userId },
      data: { totalPoints: { increment: t.pointsEarned } },
    });
  }
  console.log('✅ Transactions de démo créées');

  console.log('\n🎉 Seeding terminé avec succès !');
  console.log('\n📋 Comptes de test :');
  console.log('   Admin  : admin@ecocollect.tn / admin123');
  console.log('   User 1 : ahmed@test.tn / user123');
  console.log('   User 2 : fatma@test.tn / user123');
  console.log('   User 3 : youssef@test.tn / user123');
}

main()
  .catch((e) => {
    console.error('❌ Erreur de seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
