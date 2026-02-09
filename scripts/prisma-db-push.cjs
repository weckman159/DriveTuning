const { execSync } = require('node:child_process');

function chooseSchema() {
  if (process.env.PRISMA_SCHEMA) return process.env.PRISMA_SCHEMA;
  const url = String(process.env.DATABASE_URL || '');
  if (/^postgres(ql)?:/i.test(url)) return 'prisma/schema.postgres.prisma';
  return 'prisma/schema.prisma';
}

const schema = chooseSchema();

console.log(`[prisma] db push using schema: ${schema}`);
execSync(`npx prisma db push --schema "${schema}"`, { stdio: 'inherit' });

