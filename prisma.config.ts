import "dotenv/config"
import { defineConfig, env } from "prisma/config"

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // This is the only place the DB URL lives now (Prisma 7+)
    // For Neon, use the pooled connection string for the app
    // and the direct (unpooled) connection string here for migrations.
    // If you only have one URL, use it for both.
    url: env("DATABASE_URL"),
  },
})
