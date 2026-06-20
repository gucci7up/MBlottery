/**
 * Seed idempotente — puede ejecutarse múltiples veces sin duplicar datos.
 * Uso: npx ts-node prisma/seed.ts
 */
import { PrismaClient, UserRole, PayoutTableStatus, Modality } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // ─── LOTTERY PROVIDERS ────────────────────────────────────────────────────
  const providers = [
    { name: 'Nacional', code: 'NAC', country: 'DO', sortOrder: 1 },
    { name: 'Leidsa', code: 'LEIDSA', country: 'DO', sortOrder: 2 },
    { name: 'Loteka', code: 'LOTEKA', country: 'DO', sortOrder: 3 },
    { name: 'Real', code: 'REAL', country: 'DO', sortOrder: 4 },
    { name: 'Gana Más', code: 'GANA_MAS', country: 'DO', sortOrder: 5 },
    { name: 'New York Tarde', code: 'NY_TARDE', country: 'US', sortOrder: 6 },
    { name: 'New York Noche', code: 'NY_NOCHE', country: 'US', sortOrder: 7 },
    { name: 'Florida Día', code: 'FL_DIA', country: 'US', sortOrder: 8 },
    { name: 'Florida Noche', code: 'FL_NOCHE', country: 'US', sortOrder: 9 },
    { name: 'King Lottery', code: 'KING', country: 'INT', sortOrder: 10 },
    { name: 'Anguilla', code: 'ANGUILLA', country: 'AI', sortOrder: 11 },
  ];

  for (const p of providers) {
    await prisma.lotteryProvider.upsert({
      where: { code: p.code },
      update: { name: p.name, sortOrder: p.sortOrder },
      create: { ...p, active: true },
    });
  }
  console.log(`✅ ${providers.length} loterías registradas`);

  // ─── OPERATOR PRINCIPAL ───────────────────────────────────────────────────
  const operator = await prisma.operator.upsert({
    where: { slug: 'sistema-banca-demo' },
    update: {},
    create: {
      name: 'Sistema de Banca Demo',
      slug: 'sistema-banca-demo',
      contactEmail: 'admin@sistemabanca.com',
      status: 'ACTIVE',
    },
  });
  console.log(`✅ Operator: ${operator.name} (${operator.id})`);

  // ─── SUPER ADMIN (plataforma) ─────────────────────────────────────────────
  const superAdminPin = await bcrypt.hash('000000', 12);
  const superAdmin = await prisma.user.upsert({
    where: { operatorId_username: { operatorId: operator.id, username: 'superadmin' } },
    update: {},
    create: {
      operatorId: operator.id,
      name: 'Super Administrador',
      username: 'superadmin',
      pin: superAdminPin,
      role: UserRole.SUPER_ADMIN,
      active: true,
    },
  });
  console.log(`✅ Super Admin creado (usuario: superadmin, PIN: 000000)`);

  // ─── OPERATOR ADMIN ───────────────────────────────────────────────────────
  const adminPin = await bcrypt.hash('1234', 12);
  const operatorAdmin = await prisma.user.upsert({
    where: { operatorId_username: { operatorId: operator.id, username: 'admin' } },
    update: {},
    create: {
      operatorId: operator.id,
      name: 'Administrador',
      username: 'admin',
      pin: adminPin,
      role: UserRole.OPERATOR_ADMIN,
      active: true,
    },
  });
  console.log(`✅ Operator Admin creado (usuario: admin, PIN: 1234)`);

  // ─── BANCAS ───────────────────────────────────────────────────────────────
  const branches = [
    { code: 'B001', name: 'Sucursal Norte', address: 'Av. 27 de Febrero, Santiago' },
    { code: 'B002', name: 'Sucursal Centro', address: 'Calle El Conde, Santo Domingo' },
    { code: 'B003', name: 'Sucursal Este', address: 'Av. España, San Pedro de Macorís' },
  ];

  const createdBranches: { id: string; code: string; name: string }[] = [];
  for (const b of branches) {
    const branch = await prisma.branch.upsert({
      where: { operatorId_code: { operatorId: operator.id, code: b.code } },
      update: { name: b.name },
      create: { ...b, operatorId: operator.id, status: 'ACTIVE' },
    });
    createdBranches.push(branch);
  }
  console.log(`✅ ${branches.length} bancas registradas`);

  // ─── SUPERVISOR + CAJERO por banca ────────────────────────────────────────
  const supervisorPin = await bcrypt.hash('5678', 12);
  const cashierPin = await bcrypt.hash('9999', 12);

  for (const branch of createdBranches) {
    await prisma.user.upsert({
      where: { operatorId_username: { operatorId: operator.id, username: `sup_${branch.code.toLowerCase()}` } },
      update: {},
      create: {
        operatorId: operator.id,
        branchId: branch.id,
        name: `Supervisor ${branch.name}`,
        username: `sup_${branch.code.toLowerCase()}`,
        pin: supervisorPin,
        role: UserRole.SUPERVISOR,
        active: true,
      },
    });

    await prisma.user.upsert({
      where: { operatorId_username: { operatorId: operator.id, username: `caj_${branch.code.toLowerCase()}` } },
      update: {},
      create: {
        operatorId: operator.id,
        branchId: branch.id,
        name: `Cajero ${branch.name}`,
        username: `caj_${branch.code.toLowerCase()}`,
        pin: cashierPin,
        role: UserRole.CASHIER,
        active: true,
      },
    });
  }
  console.log(`✅ Supervisores y cajeros creados (PINs: 5678 / 9999)`);

  // ─── PAYOUT TABLE POR DEFECTO ─────────────────────────────────────────────
  // Verificar si ya hay una tabla activa
  const existingTable = await prisma.payoutTable.findFirst({
    where: { operatorId: operator.id, status: PayoutTableStatus.ACTIVE },
  });

  if (!existingTable) {
    const payoutTable = await prisma.payoutTable.create({
      data: {
        operatorId: operator.id,
        name: 'Tabla Estándar 2026',
        status: PayoutTableStatus.ACTIVE,
        effectiveFrom: new Date('2026-01-01'),
        createdBy: operatorAdmin.id,
        approvedBy: superAdmin.id,
        approvedAt: new Date(),
        entries: {
          create: [
            // Sin restricción de lotería (aplica a todas)
            { modality: Modality.QUINIELA, multiplier: 60, minBetAmount: 5, maxBetAmount: 500 },
            { modality: Modality.PALE, multiplier: 350, minBetAmount: 5, maxBetAmount: 200 },
            { modality: Modality.TRIPLETA, multiplier: 1500, minBetAmount: 5, maxBetAmount: 100 },
            { modality: Modality.SUPER_PALE, multiplier: 2000, minBetAmount: 5, maxBetAmount: 100 },
          ],
        },
      },
    });
    console.log(`✅ PayoutTable por defecto creada (ID: ${payoutTable.id})`);
  } else {
    console.log(`ℹ️  PayoutTable activa ya existe (ID: ${existingTable.id})`);
  }

  // ─── SETTINGS POR DEFECTO ─────────────────────────────────────────────────
  const settings = [
    { key: 'ticket_expiry_days', value: '30' },
    { key: 'allow_cancel_minutes', value: '60' },
  ];

  for (const s of settings) {
    await prisma.operatorSetting.upsert({
      where: { operatorId_key: { operatorId: operator.id, key: s.key } },
      update: {},
      create: { operatorId: operator.id, ...s },
    });
  }

  for (const branch of createdBranches) {
    await prisma.branchSetting.upsert({
      where: { branchId_key: { branchId: branch.id, key: 'max_cashier_payment' } },
      update: {},
      create: { branchId: branch.id, key: 'max_cashier_payment', value: '5000' },
    });
  }
  console.log('✅ Settings por defecto configurados');

  // ─── RESUMEN ──────────────────────────────────────────────────────────────
  console.log('\n📋 CREDENCIALES DE ACCESO');
  console.log('─'.repeat(40));
  console.log('Super Admin: superadmin / 000000');
  console.log('Operator Admin: admin / 1234');
  console.log('Supervisor B001: sup_b001 / 5678');
  console.log('Cajero B001: caj_b001 / 9999');
  console.log('─'.repeat(40));
  console.log('✅ Seed completado');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
