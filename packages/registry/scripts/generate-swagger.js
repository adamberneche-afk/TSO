const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');
const fs = require('fs');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'TAIS Registry API',
      version: '1.0.0',
      description: 'API documentation for TAIS Skill Registry',
    },
    servers: [
      {
        url: 'https://tso.onrender.com',
        description: 'Production server',
      },
      {
        url: 'http://localhost:10000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  // Path to the API docs
  apis: ['./src/routes/**/*.ts', './src/index.ts'],
};

const openapiSpec = swaggerJsdoc(options);

// Ensure directory exists
const outDir = path.join(__dirname, '..', 'docs');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const outFile = path.join(outDir, 'openapi.json');
fs.writeFileSync(outFile, JSON.stringify(openapiSpec, null, 2));
console.log(`Swagger spec generated at ${outFile}`);