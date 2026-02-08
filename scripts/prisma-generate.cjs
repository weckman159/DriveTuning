const { execSync } = require('node:child_process');

const schema = process.env.PRISMA_SCHEMA || 'prisma/schema.prisma';

console.log(`[prisma] generating client using schema: ${schema}`);
execSync(`npx prisma generate --schema "${schema}"`, { stdio: 'inherit' });
