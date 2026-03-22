// Prisma 7 加载本配置时不会自动读 .env；本地请用 .env 提供 DATABASE_URL。
// CI 或 Docker 构建阶段执行 prisma generate 时往往尚未注入数据库地址，故用占位 URL，
// 仅用于生成 Client，不会发起真实连接。运行时仍须配置真实的 DATABASE_URL。
import 'dotenv/config'

import { defineConfig } from 'prisma/config'

const datasourceUrl =
  process.env.DATABASE_URL?.trim() ||
  "mysql://root:TwVuUWFbaYvhdMTnEYDsWJnlLfmrXdcF@ballast.proxy.rlwy.net:57929/railway"

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: datasourceUrl,
  },
})
