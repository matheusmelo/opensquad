const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // 1. Create a mock user
    const user = await prisma.user.upsert({
        where: { whatsappNumber: '+5511999999999' },
        update: {},
        create: {
            whatsappNumber: '+5511999999999',
            nome: 'Mateus Vinícius',
            plano: 'premium'
        }
    });

    console.log(`User created: ${user.nome}`);

    // 2. Insert Classification Rules
    await prisma.classificationRule.createMany({
        data: [
            { pattern: 'UBER', contexto: 'PF', pulmao: 1, categoria: 'Transporte' },
            { pattern: 'NETFLIX', contexto: 'PF', pulmao: 3, categoria: 'Lazer' },
            { pattern: 'FARMACIA', contexto: 'PF', pulmao: 2, categoria: 'Saúde' },
            { pattern: 'META ADS', contexto: 'PJ', pulmao: null, categoria: 'Marketing' }
        ]
    });

    // 3. Insert mock 3 Pulmões Transactions for the user
    const today = new Date();

    await prisma.transaction.createMany({
        data: [
            { data: today, descricao: 'UBER *TRIP', valor: 25.50, contexto: 'PF', pulmao: 1, categoria: 'Transporte', confianca: 1.0, userId: user.id },
            { data: today, descricao: 'PAG*ENERGIA ELETRICA', valor: 280.00, contexto: 'PF', pulmao: 1, categoria: 'Serviços', confianca: 0.95, userId: user.id },
            { data: today, descricao: 'RESTAURANTE OUTBACK', valor: 320.00, contexto: 'PF', pulmao: 3, categoria: 'Lazer', confianca: 0.98, userId: user.id },
            { data: new Date(today.getTime() - 86400000), descricao: 'DROGASIL', valor: 145.00, contexto: 'PF', pulmao: 2, categoria: 'Saúde', confianca: 0.9, userId: user.id },
            { data: new Date(today.getTime() - 86400000 * 2), descricao: 'FACEBOOK ADS ORION', valor: 1500.00, contexto: 'PJ', pulmao: null, categoria: 'Tráfego', confianca: 1.0, userId: user.id },
        ]
    });

    console.log('Seed completed successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
