"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs");
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#'))
            continue;
        const eq = trimmed.indexOf('=');
        if (eq < 0)
            continue;
        const key = trimmed.slice(0, eq).trim();
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
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
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
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: ['log', 'error', 'warn'],
    });
    app.use(require('express').json({ limit: '2mb' }));
    app.use(require('express').urlencoded({ limit: '2mb', extended: true }));
    app.enableCors({
        origin: corsOrigins,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
    }));
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
//# sourceMappingURL=main.js.map