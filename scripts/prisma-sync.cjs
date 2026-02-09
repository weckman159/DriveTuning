const { execSync } = require('node:child_process');

function chooseSchema() {
  if (process.env.PRISMA_SCHEMA) return process.env.PRISMA_SCHEMA;
  const url = String(process.env.DATABASE_URL || '');
  if (/^postgres(ql)?:/i.test(url)) return 'prisma/schema.postgres.prisma';
  return 'prisma/schema.prisma';
}

function isPostgresSchema(schemaPath) {
  return /schema\.postgres\.prisma$/i.test(String(schemaPath || ''));
}

const schema = chooseSchema();

if (isPostgresSchema(schema)) {
  console.log(`[prisma] sync (postgres): migrate deploy using schema: ${schema}`);
  execSync(`npx prisma migrate deploy --schema "${schema}"`, { stdio: 'inherit' });
} else {
  console.log(`[prisma] sync (sqlite): db push using schema: ${schema}`);
  execSync(`npx prisma db push --schema "${schema}"`, { stdio: 'inherit' });
}

