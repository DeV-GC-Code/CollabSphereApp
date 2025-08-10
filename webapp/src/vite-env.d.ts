/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_FEATURE_COMMUNITIES: string
  readonly VITE_FEATURE_NOTIFICATIONS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
