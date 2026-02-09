/**
 * Demo Skills Seed Script
 * 
 * This script populates the TAIS Registry database with demo skills
 * for testing and demonstration purposes.
 * 
 * Usage:
 *   npm run db:seed
 *   or
 *   npx ts-node prisma/seed.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Check if skills already exist
  const existingCount = await prisma.skill.count();
  if (existingCount > 0) {
    console.log(`⚠️  Database already contains ${existingCount} skills.`);
    console.log('   Use --force to overwrite or delete existing skills first.\n');
    process.exit(0);
  }

  // Create categories
  console.log('📂 Creating categories...');
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'API Integration',
        description: 'Skills that integrate with external APIs'
      }
    }),
    prisma.category.create({
      data: {
        name: 'Data Processing',
        description: 'Skills for data transformation and analysis'
      }
    }),
    prisma.category.create({
      data: {
        name: 'Finance',
        description: 'Financial and cryptocurrency related skills'
      }
    }),
    prisma.category.create({
      data: {
        name: 'Utilities',
        description: 'General utility and helper skills'
      }
    })
  ]);
  console.log(`✅ Created ${categories.length} categories\n`);

  // Create tags
  console.log('🏷️  Creating tags...');
  const tags = await Promise.all([
    prisma.tag.create({ data: { name: 'weather' } }),
    prisma.tag.create({ data: { name: 'api' } }),
    prisma.tag.create({ data: { name: 'data' } }),
    prisma.tag.create({ data: { name: 'transform' } }),
    prisma.tag.create({ data: { name: 'crypto' } }),
    prisma.tag.create({ data: { name: 'bitcoin' } }),
    prisma.tag.create({ data: { name: 'ethereum' } }),
    prisma.tag.create({ data: { name: 'finance' } }),
    prisma.tag.create({ data: { name: 'popular' } }),
    prisma.tag.create({ data: { name: 'verified' } })
  ]);
  console.log(`✅ Created ${tags.length} tags\n`);

  // Create demo skills
  console.log('📦 Creating demo skills...\n');

  // Skill 1: Weather API
  const weatherSkill = await prisma.skill.create({
    data: {
      skillHash: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
      name: 'weather-api',
      version: '1.2.0',
      description: 'Get real-time weather data from multiple sources including OpenWeatherMap and WeatherAPI',
      author: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      manifestCid: 'QmWeatherManifest123',
      packageCid: 'QmWeatherPackage456',
      permissions: {
        network: {
          domains: ['api.openweathermap.org', 'api.weatherapi.com'],
          methods: ['GET']
        },
        filesystem: {
          read: [],
          write: ['/tmp/weather-cache']
        },
        env_vars: ['OPENWEATHER_API_KEY', 'WEATHERAPI_KEY'],
        modules: ['axios', 'moment']
      },
      trustScore: 0.85,
      downloadCount: 2500,
      status: 'APPROVED',
      isBlocked: false,
      categories: {
        create: [
          { categoryId: categories[0].id }, // API Integration
          { categoryId: categories[3].id }  // Utilities
        ]
      },
      tags: {
        create: [
          { tagId: tags[0].id }, // weather
          { tagId: tags[1].id }, // api
          { tagId: tags[8].id }, // popular
          { tagId: tags[9].id }  // verified
        ]
      }
    }
  });
  console.log('✅ Created: weather-api (Trust Score: 0.85)');

  // Skill 2: Data Processor
  const dataProcessorSkill = await prisma.skill.create({
    data: {
      skillHash: 'b2c3d4e5f6a7890123456789012345678901abcdef2345678901abcdef234567',
      name: 'data-processor',
      version: '2.0.1',
      description: 'Transform, filter, and analyze JSON data with powerful utilities for data manipulation',
      author: '0x9876543210987654321098765432109876543210',
      manifestCid: 'QmDataManifest789',
      packageCid: 'QmDataPackage012',
      permissions: {
        network: {
          domains: [],
          methods: []
        },
        filesystem: {
          read: ['/data/input'],
          write: ['/data/output', '/tmp']
        },
        env_vars: [],
        modules: ['lodash', 'moment']
      },
      trustScore: 0.92,
      downloadCount: 1800,
      status: 'APPROVED',
      isBlocked: false,
      categories: {
        create: [
          { categoryId: categories[1].id } // Data Processing
        ]
      },
      tags: {
        create: [
          { tagId: tags[2].id }, // data
          { tagId: tags[3].id }, // transform
          { tagId: tags[8].id }, // popular
          { tagId: tags[9].id }  // verified
        ]
      }
    }
  });
  console.log('✅ Created: data-processor (Trust Score: 0.92)');

  // Skill 3: Crypto Price
  const cryptoSkill = await prisma.skill.create({
    data: {
      skillHash: 'c3d4e5f6a7b8901234567890123456789012bcdef3456789012bcdef34567890',
      name: 'crypto-price',
      version: '1.1.0',
      description: 'Get real-time cryptocurrency prices and market data from CoinGecko API',
      author: '0xabcdef1234567890abcdef1234567890abcdef12',
      manifestCid: 'QmCryptoManifest345',
      packageCid: 'QmCryptoPackage678',
      permissions: {
        network: {
          domains: ['api.coingecko.com'],
          methods: ['GET']
        },
        filesystem: {
          read: [],
          write: ['/tmp/crypto-cache']
        },
        env_vars: ['COINGECKO_API_KEY'],
        modules: ['axios']
      },
      trustScore: 0.78,
      downloadCount: 3200,
      status: 'APPROVED',
      isBlocked: false,
      categories: {
        create: [
          { categoryId: categories[2].id }, // Finance
          { categoryId: categories[0].id }  // API Integration
        ]
      },
      tags: {
        create: [
          { tagId: tags[4].id }, // crypto
          { tagId: tags[5].id }, // bitcoin
          { tagId: tags[6].id }, // ethereum
          { tagId: tags[7].id }, // finance
          { tagId: tags[8].id }  // popular
        ]
      }
    }
  });
  console.log('✅ Created: crypto-price (Trust Score: 0.78)');

  // Create sample audits
  console.log('\n🔍 Creating sample audits...');
  
  await prisma.audit.create({
    data: {
      skillId: weatherSkill.id,
      auditor: '0x9876543210987654321098765432109876543210',
      auditorNft: 'nft_auditor_001',
      status: 'SAFE',
      findings: [],
      signature: '0x' + 'a'.repeat(130),
      txHash: '0x' + 'b'.repeat(64),
      verifiedAt: new Date()
    }
  });

  await prisma.audit.create({
    data: {
      skillId: dataProcessorSkill.id,
      auditor: '0x1234567890abcdef1234567890abcdef12345678',
      auditorNft: 'nft_auditor_002',
      status: 'SAFE',
      findings: [],
      signature: '0x' + 'c'.repeat(130),
      txHash: '0x' + 'd'.repeat(64),
      verifiedAt: new Date()
    }
  });

  await prisma.audit.create({
    data: {
      skillId: cryptoSkill.id,
      auditor: '0xfedcba0987654321fedcba0987654321fedcba09',
      auditorNft: 'nft_auditor_003',
      status: 'SAFE',
      findings: [],
      signature: '0x' + 'e'.repeat(130),
      txHash: '0x' + 'f'.repeat(64),
      verifiedAt: new Date()
    }
  });
  console.log('✅ Created 3 sample audits\n');

  // Create API keys for testing
  console.log('🔑 Creating test API keys...');
  
  await prisma.apiKey.create({
    data: {
      key: 'tais_test_abcdefghijklmnopqrstuvwxyz123',
      name: 'Demo API Key',
      owner: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      tier: 'PRO',
      requestsThisMonth: 150,
      isActive: true,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
    }
  });
  console.log('✅ Created test API key\n');

  // Print summary
  console.log('📊 Seed Summary:');
  console.log('═'.repeat(50));
  console.log(`Categories:    ${categories.length}`);
  console.log(`Tags:          ${tags.length}`);
  console.log(`Skills:        3`);
  console.log(`Audits:        3`);
  console.log(`API Keys:      1`);
  console.log('═'.repeat(50));
  console.log('\n✨ Database seeded successfully!\n');
  
  console.log('🚀 Next steps:');
  console.log('  1. Start the server: npm run dev');
  console.log('  2. Visit: http://localhost:3000/api/docs');
  console.log('  3. Try the API: curl http://localhost:3000/api/skills');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });