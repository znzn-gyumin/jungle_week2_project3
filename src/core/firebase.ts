/**
 * Firebase 연결 — **한 군데에서만 붙입니다.**
 *
 * 정본: docs/TECH_DESIGN.md 4-1(인증) · 4-2(세이브) · 4-3(방명록)
 * 배포: GitHub Pages(프런트) + Firebase(인증·데이터)
 *
 * **설정값은 비밀이 아닙니다.** 웹 앱 config 는 브라우저가 어차피 다 보게
 * 되는 공개 식별자라, 이걸 감춰서 지키는 것은 없습니다. 진짜 방어선은
 * `firestore.rules` 입니다 (TECH_DESIGN 4-3 보안 규칙).
 *
 * 그래도 `.env` 로 뺀 이유는 **프로젝트를 갈아 끼우기 쉬우라고**입니다 —
 * 개발용과 배포용을 나누거나, 포크한 사람이 자기 프로젝트를 물릴 때
 * 코드를 안 건드려도 됩니다. 값은 `.env.example` 을 보고 채웁니다.
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth as fbGetAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/**
 * **어느 데이터베이스인가.**
 *
 * 콘솔에서 Firestore 를 만들 때 데이터베이스 ID 를 물어보는데, 거기를
 * `(default)` 가 아닌 이름으로 두면 **이름 있는 데이터베이스**가 됩니다.
 * SDK 는 아무것도 안 적으면 `(default)` 만 찾아가므로, 그 경우 서로 못
 * 만나 조회가 통째로 `unavailable` 로 끊깁니다 — 규칙이나 색인 문제처럼
 * 보이지만 원인은 여기입니다.
 *
 * 규칙과 색인은 **데이터베이스마다 따로** 붙는다는 점도 같이 기억해 둡니다.
 */
const DATABASE_ID = import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)';

/**
 * 설정이 채워져 있는가.
 *
 * **없어도 게임은 돌아가야 합니다.** 프로젝트를 아직 안 만든 동안에도
 * 시나리오와 맵은 손볼 수 있어야 하므로, 여기가 거짓이면 로그인 화면이
 * 「설정이 필요합니다」 로 바뀌고 저장·방명록만 잠깁니다.
 */
export function isConfigured(): boolean {
  return Boolean(CONFIG.apiKey && CONFIG.projectId && CONFIG.appId);
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

/** 처음 쓸 때 한 번만 붙습니다 — 설정이 없으면 아예 안 붙입니다 */
function ensure(): FirebaseApp | null {
  if (!isConfigured()) return null;
  app ??= initializeApp(CONFIG);
  return app;
}

export function getAuth(): Auth | null {
  const a = ensure();
  if (!a) return null;
  auth ??= fbGetAuth(a);
  return auth;
}

export function getDb(): Firestore | null {
  const a = ensure();
  if (!a) return null;
  db ??= getFirestore(a, DATABASE_ID);
  return db;
}
