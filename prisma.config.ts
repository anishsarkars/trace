import { defineClientConfig } from '@prisma/client/config'

export default defineClientConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
})
