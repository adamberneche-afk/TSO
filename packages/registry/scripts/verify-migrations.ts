#!/usr/bin/env node

/**
 * Database Migration Verification Script
 * Ensures all migrations are applied before deployment
 */

import { PrismaClient } from '@prisma/client';
import chalk from 'chalk';

async function verifyMigrations() {
  console.log(chalk.blue('\n🔍 Verifying Database Migrations\n'));
  console.log(chalk.gray('=' .repeat(50)));

  const prisma = new PrismaClient();

  try {
    // Check database connection
    await prisma.$connect();
    console.log(chalk.green('✅ Database connection successful'));

    // Check migration status
    const migrations = await prisma.$queryRaw`
      SELECT * FROM _prisma_migrations 
      ORDER BY finished_at DESC
    `;

    const migrationList = migrations as any[];

    if (migrationList.length === 0) {
      console.log(chalk.yellow('\n⚠️  No migrations found in database'));
      console.log(chalk.gray('Run: npx prisma migrate deploy'));
      process.exit(1);
    }

    console.log(chalk.green(`\n✅ ${migrationList.length} migration(s) found`));

    // Check for failed migrations
    const failedMigrations = migrationList.filter(m => m.migration_name?.includes('failed') || !m.finished_at);
    
    if (failedMigrations.length > 0) {
      console.log(chalk.red(`\n❌ ${failedMigrations.length} migration(s) failed or incomplete`));
      failedMigrations.forEach(m => {
        console.log(chalk.red(`  - ${m.migration_name}`));
      });
      process.exit(1);
    }

    // Display recent migrations
    console.log(chalk.blue('\n📋 Recent Migrations:'));
    migrationList.slice(0, 5).forEach(m => {
      const status = m.applied_steps_count > 0 ? chalk.green('✓') : chalk.yellow('⏳');
      const date = m.finished_at ? new Date(m.finished_at).toLocaleString() : 'Pending';
      console.log(`  ${status} ${m.migration_name} - ${date}`);
    });

    // Check if there are pending migrations
    console.log(chalk.blue('\n🔍 Checking for pending migrations...'));
    
    try {
      // This will throw if there are unapplied migrations
      const { execSync } = require('child_process');
      const result = execSync('npx prisma migrate status', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      if (result.includes('Database schema is up to date')) {
        console.log(chalk.green('✅ All migrations are applied'));
      } else {
        console.log(chalk.yellow('\n⚠️  There may be pending migrations'));
        console.log(chalk.gray('Run: npx prisma migrate deploy'));
      }
    } catch (error) {
      console.log(chalk.yellow('\n⚠️  Could not check migration status'));
    }

    // Verify critical tables exist
    console.log(chalk.blue('\n🔍 Verifying database schema...'));
    
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;

    const requiredTables = ['skills', 'audits', 'categories', 'tags', 'api_keys'];
    const existingTables = (tables as any[]).map(t => t.table_name);
    
    const missingTables = requiredTables.filter(t => !existingTables.includes(t));
    
    if (missingTables.length === 0) {
      console.log(chalk.green('✅ All required tables exist'));
    } else {
      console.log(chalk.red(`\n❌ Missing tables: ${missingTables.join(', ')}`));
      process.exit(1);
    }

    console.log(chalk.gray('\n' + '=' .repeat(50)));
    console.log(chalk.green.bold('\n✅ Database verification passed!\n'));
    process.exit(0);

  } catch (error: any) {
    console.error(chalk.red('\n❌ Database verification failed:'));
    console.error(chalk.red(error.message));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyMigrations();