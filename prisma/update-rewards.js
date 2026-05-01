/**
 * Update rewards in the database to match the new poster menu.
 * Run: node prisma/update-rewards.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const newRewards = [
  { name: 'Café Gratuit', description: 'Un café offert — présentez le code au barista', pointsCost: 250, category: 'coffee' },
  { name: 'Soda Gratuit', description: 'Un soda offert — présentez le code au barista', pointsCost: 300, category: 'drink' },
  { name: 'Jus Gratuit', description: 'Un jus de fruits offert — présentez le code au barista', pointsCost: 350, category: 'drink' },
  { name: 'Thé Glacé Gratuit', description: 'Un thé glacé offert — présentez le code au barista', pointsCost: 400, category: 'drink' },
  { name: 'Glace Gratuite', description: 'Une glace offerte — présentez le code au barista', pointsCost: 450, category: 'gift' },
  { name: 'Sandwich Gratuit', description: 'Un sandwich offert — présentez le code au barista', pointsCost: 500, category: 'gift' },
];

async function main() {
  console.log('🔄 Updating rewards...\n');

  // Deactivate all old rewards
  await prisma.reward.updateMany({
    data: { isActive: false },
  });
  console.log('✅ Old rewards deactivated');

  // Create new rewards
  for (const r of newRewards) {
    const existing = await prisma.reward.findFirst({
      where: { name: r.name },
    });

    if (existing) {
      await prisma.reward.update({
        where: { id: existing.id },
        data: { ...r, isActive: true },
      });
      console.log(`✅ Updated: ${r.name} (${r.pointsCost} pts)`);
    } else {
      await prisma.reward.create({
        data: { ...r, isActive: true },
      });
      console.log(`✅ Created: ${r.name} (${r.pointsCost} pts)`);
    }
  }

  console.log('\n🎉 Rewards updated successfully!');
}

main()
  .catch((e) => { console.error('❌ Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
