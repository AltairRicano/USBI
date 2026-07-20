/// <reference types="vite/client" />

interface Window {
  __TAURI__?: unknown;
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_PRIVACY_NOTICE_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
