import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  engine: "classic",
  datasource: {
    url: env("MONGODB_URI"),
  },
  // Note: MongoDB doesn't use traditional migrations
  // Use `prisma db push` to sync schema changes to the database
});
