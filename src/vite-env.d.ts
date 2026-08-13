/// <reference types="vite/client" />

declare module 'virtual:script' {
  import type { ScriptData } from './core/types';
  const data: ScriptData;
  export default data;
}

/**
 * Firebase 웹 앱 config (`.env` · 값은 `.env.example` 참고).
 *
 * **비밀이 아닙니다** — 브라우저가 어차피 다 보는 공개 식별자입니다.
 * 실제 방어선은 `firestore.rules` 입니다 (TECH_DESIGN 4-3).
 * 값이 없으면 로그인·저장·방명록만 잠기고 게임 본편은 그대로 돕니다.
 */
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  /**
   * 이름 있는 Firestore 데이터베이스를 쓸 때만 적습니다.
   * 비워 두면 `(default)` 입니다 — 콘솔에서 ID 를 따로 정했다면 그 이름.
   */
  readonly VITE_FIREBASE_DATABASE_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
