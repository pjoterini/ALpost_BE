declare global {
  namespace NodeJS {
    interface ProcessEnv {
      POSTGRES_URL: string
      REDIS_URL: string
      PORT: string
      SESSION_SECRET: string
      CORS_ORIGIN: string
    }
  }
}

export {}
