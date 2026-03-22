// Prisma 7 加载本配置时不会自动读 .env，需先注入 DATABASE_URL
import 'dotenv/config'

import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
