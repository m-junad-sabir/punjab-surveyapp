"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs");
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#'))
            continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx < 0)
            continue;
        const key = trimmed.substring(0, eqIdx).trim();
        const val = trimmed.substring(eqIdx + 1).trim();
        if (key && !(key in process.env)) {
            process.env[key] = val;
        }
    }
}
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const express = require("express");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: ['log', 'error', 'warn'],
    });
    const httpAdapter = app.getHttpAdapter().getInstance();
    httpAdapter.use(express.json({ limit: '25mb' }));
    httpAdapter.use(express.urlencoded({ limit: '25mb', extended: true }));
    app.enableCors({
        origin: '*',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
    }));
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
//# sourceMappingURL=main.js.map