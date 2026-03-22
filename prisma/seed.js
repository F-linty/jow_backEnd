const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

const adapter = new PrismaMariaDb({
  host: 'localhost',
  user: 'root',
  password: 'flintyY',
  database: 'jow',
  port: 3306,
  connectionLimit: 5,
  allowPublicKeyRetrieval: true,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // 1) 准备组织
  const orgName = '总部';
  let org = await prisma.organization.findFirst({
    where: { name: orgName },
  });
  if (!org) {
    org = await prisma.organization.create({
      data: { name: orgName, sort: 0 },
    });
  }

  // 2) 准备管理员用户（供登录使用）
  const account = 'admin';
  const passWord = '123456';
  const user = await prisma.user.upsert({
    where: { account },
    update: {
      passWord,
      userName: '管理员',
      orgId: org.id,
    },
    create: {
      account,
      passWord,
      userName: '管理员',
      orgId: org.id,
    },
  });

  // 3) 准备首页表格数据：至少 1 条月度采购计划
  const month = '2026-03';
  await prisma.purchasePlan.deleteMany({
    where: { month, orgId: org.id },
  });

  const plan = await prisma.purchasePlan.create({
    data: {
      month,
      orgId: org.id,
      createdByUserId: user.id,
      planName: `${month} 采购计划（种子数据）`,
    },
  });

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        org: { id: org.id, name: org.name },
        user: { id: user.id, account: user.account },
        purchasePlan: { id: plan.id, month: plan.month },
      },
      null,
      2,
    ),
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
    // eslint-disable-next-line no-console
    console.log('seed done');
  })
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error('seed failed', e);
    await prisma.$disconnect();
    process.exit(1);
  });

