/**
 * 인증 — **Google 하나뿐입니다.**
 *
 * 정본: docs/TECH_DESIGN.md 4-1 · docs/GAME_DESIGN.md 2-5
 *
 * 이메일/비밀번호를 두지 않으므로 재설정·인증메일 흐름이 통째로 없습니다.
 * `signInWithPopup` 을 씁니다 — 리다이렉트 방식은 Pages 서브패스
 * (`/jungle_week2_project3/`)에서 복귀 경로가 꼬입니다.
 */
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
} from 'firebase/auth';

import { getAuth, isConfigured } from './firebase';

/** 방명록에 그대로 실리는 이름입니다 (TECH_DESIGN 4-1) */
export type Session = {
  uid: string;
  displayName: string;
};

let session: Session | null = null;
const watchers = new Set<(s: Session | null) => void>();

function setSession(s: Session | null): void {
  session = s;
  for (const w of watchers) w(s);
}

export function currentSession(): Session | null {
  return session;
}

/**
 * 로그인 상태가 바뀔 때마다 불립니다. **바로 한 번 불러 줍니다** —
 * 구독하는 쪽이 「지금은 어떤 상태인가」 를 따로 물을 필요가 없습니다.
 */
export function onSession(fn: (s: Session | null) => void): () => void {
  watchers.add(fn);
  fn(session);
  return () => watchers.delete(fn);
}

/**
 * 새로고침해도 로그인이 유지되는지 Firebase 가 알려줄 때까지 기다립니다.
 * 이걸 안 기다리면 이미 로그인한 사람에게도 로그인 화면이 한 번 번쩍입니다.
 */
export function restore(): Promise<Session | null> {
  const auth = getAuth();
  if (!auth) return Promise.resolve(null);
  return new Promise((resolve) => {
    const stop = onAuthStateChanged(auth, (u) => {
      setSession(u ? { uid: u.uid, displayName: u.displayName ?? '이름 없음' } : null);
      stop();
      resolve(session);
    });
    // 이후 변화(다른 탭에서 로그아웃 등)도 계속 따라갑니다
    onAuthStateChanged(auth, (u) => {
      setSession(u ? { uid: u.uid, displayName: u.displayName ?? '이름 없음' } : null);
    });
  });
}

export async function signIn(): Promise<Session> {
  const auth = getAuth();
  if (!auth) throw new Error('Firebase 설정이 없습니다 (.env.example 참고)');
  const cred = await signInWithPopup(auth, new GoogleAuthProvider());
  const s: Session = {
    uid: cred.user.uid,
    displayName: cred.user.displayName ?? '이름 없음',
  };
  setSession(s);
  return s;
}

export async function signOut(): Promise<void> {
  const auth = getAuth();
  if (auth) await fbSignOut(auth);
  setSession(null);
}

/** 로그인 창이 뜰 수 있는 상태인가 — 설정이 없으면 버튼을 잠급니다 */
export const canSignIn = isConfigured;
