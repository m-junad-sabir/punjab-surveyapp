import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  ...(process.env.DATABASE_URL
    ? { url: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
      }),
  entities: [__dirname + '/../dal/entities/**/*.entity{.ts,.js}'],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
  retryAttempts: 3,
  retryDelay: 2000,
});
