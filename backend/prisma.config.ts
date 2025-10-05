import { defineConfig } from '@prisma/config';
import 'dotenv/config';
import path from 'path';

// Override DATABASE_URL for local development if not in Docker
if (process.env.NODE_ENV !== 'production' && !process.env.DOCKER_ENV) {
  process.env.DATABASE_URL =
    'postgresql://template_user:template_password@localhost:5432/template_db';
}

export default defineConfig({
  schema: path.join(__dirname, 'src/database/prisma/schema.prisma'),
  migrations: {
    path: path.join(__dirname, 'src/database/prisma/migrations'),
  },
});
