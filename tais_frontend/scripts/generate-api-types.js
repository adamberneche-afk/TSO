const { execSync } = require('child_process');
const path = require('path');

const specPath = path.resolve(__dirname, '..', 'packages', 'registry', 'docs', 'openapi.json');
const outPath = path.resolve(__dirname, 'src', 'api', 'types.ts');

try {
  execSync(`npx openapi-typescript ${specPath} --output ${outPath}`, { stdio: 'inherit' });
  console.log(`Generated API types at ${outPath}`);
} catch (error) {
  console.error('Failed to generate API types:', error);
  process.exit(1);
}