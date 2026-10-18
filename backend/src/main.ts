import * as path from 'path';
import * as fs   from 'fs';

// ─── Load .env before NestJS boots ───────────────────────────────────────────
// Using a manual parser so we avoid pulling in @nestjs/config as a dependency.
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    // Strip surrounding quotes from the value
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key && !(key in process.env)) {
      process.env[key] = val;
    }
  }
}

import { NestFactory }      from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule }         from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const isProduction = process.env.NODE_ENV === 'production';

  const jwtSecret = process.env.JWT_SECRET ?? '';
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters long.');
  }

  const corsOrigins = (process.env.CORS_ORIGIN ?? (isProduction ? '' : 'http://localhost:5173'))
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  if (corsOrigins.length === 0) {
    throw new Error('CORS_ORIGIN must be set in production (comma-separated list of allowed origins).');
  }

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  // ── JSON body limit; photo data is uploaded separately as multipart ────────
  app.use(require('express').json({ limit: '2mb' }));
  app.use(require('express').urlencoded({ limit: '2mb', extended: true }));

  // ── CORS ───────────────────────────────────────────────────────────────────
  // credentials:true is intentionally omitted — the app uses Bearer tokens,
  // not cookies, so it isn't needed and would break origin:* in browsers.
  app.enableCors({
    origin:  corsOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  // ── Global validation pipe ─────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:            true,
      transform:            true,
      forbidNonWhitelisted: false,
    }),
  );

  const port = parseInt(process.env.PORT ?? '3002', 10);

  await app.listen(port);

  logger.log(`✅ Backend running  → http://localhost:${port}`);
  logger.log(`🗄️  Database        → ${process.env.DATABASE_URL ? 'DATABASE_URL' : `${process.env.DB_DATABASE}@${process.env.DB_HOST}:${process.env.DB_PORT}`}`);
  logger.log(`🌐 CORS origins    → ${corsOrigins.join(', ')}`);
  logger.log(`🔑 JWT expires in  → 1d`);
}

bootstrap().catch((err) => {
  console.error('❌ Backend failed to start!');
  console.error('Reason:', err.message);
  process.exit(1);
});
