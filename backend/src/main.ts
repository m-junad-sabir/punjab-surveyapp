// Load .env before anything else
import * as path from 'path';
import * as fs from 'fs';

// Manually load .env file (no extra dependency needed)
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.substring(0, eqIdx).trim();
    const val = trimmed.substring(eqIdx + 1).trim();
    if (key && !(key in process.env)) {
      process.env[key] = val;
    }
  }
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`✅ Backend running on http://localhost:${port}`);
  logger.log(`🗄️  Database: ${process.env.DB_DATABASE} @ ${process.env.DB_HOST}:${process.env.DB_PORT} (user: ${process.env.DB_USERNAME})`);
}

bootstrap().catch((err) => {
  console.error('\n❌ Backend failed to start!\n');
  console.error('Reason:', err.message);
  if (err.message?.includes('password authentication')) {
    console.error('\n🔑 Fix: Wrong PostgreSQL password in .env file');
    console.error('   Open: backend/.env');
    console.error('   Set:  DB_PASSWORD=your_actual_postgres_password\n');
  }
  if (err.message?.includes('does not exist')) {
    console.error('\n🗄️  Fix: Database not created yet');
    console.error('   Run: SETUP_DATABASE.bat\n');
  }
  if (err.message?.includes('ECONNREFUSED')) {
    console.error('\n🔌 Fix: PostgreSQL is not running');
    console.error('   Open Services (Win+R → services.msc) and start PostgreSQL\n');
  }
  process.exit(1);
});
