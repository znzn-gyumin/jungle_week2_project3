/**
 * 세이브 — **정본은 Firestore 입니다.**
 *
 * 정본: docs/TECH_DESIGN.md 4-2
 *
 *     users/{uid}
 *       ├─ profile        { displayName, firstSeenAt, maxDay, … }
 *       └─ saves/{slot}   { state, savedAt, chapterDay, route }
 *
 * **수동 3슬롯 + 오토 1슬롯.** `chapterDay` 와 `route` 는 `state` 안에도
 * 있지만 밖에 한 번 더 둡니다 — 슬롯 목록(「D5까지 · 장윤정 루트」)을
 * 그리려고 세이브 본문을 통째로 읽지 않기 위해서입니다.
 *
 * `savedAt` 은 `serverTimestamp()` 로 찍습니다. **클라이언트 시계를 안
 * 믿습니다** — 시각을 앞당겨 목록 위를 차지하는 걸 막습니다.
 */
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { currentSession } from './auth';
import { getDb } from './firebase';
import type { GameState, RouteId } from './types';

export type SlotId = '1' | '2' | '3' | 'auto';
export const SLOTS: SlotId[] = ['1', '2', '3', 'auto'];

export type SlotInfo = {
  slot: SlotId;
  savedAt: Date | null;
  chapterDay: number;
  route: RouteId | null;
  /** 그 시점의 이름 — 슬롯 목록에 「이도윤 · D5」 처럼 적습니다 */
  who: string;
};

/**
 * **지금 플레이 중인 칸.** 세이브 파일 화면에서 고른 칸이 그대로 따라옵니다.
 *
 * 저장 버튼이 「어느 칸에 저장할까요」를 다시 묻지 않기 위해서입니다 —
 * 어느 파일을 열어 놓고 하는지가 이미 정해져 있는데 매번 되묻는 것은
 * 파일을 연다는 개념과 어긋납니다. 고른 적이 없으면(데모 등) 오토세이브
 * 칸으로 떨어져, 저장을 눌러도 사람이 고른 칸을 안 덮습니다.
 */
let active: SlotId = 'auto';

export function setActiveSlot(slot: SlotId): void {
  active = slot;
}

export function activeSlot(): SlotId {
  return active;
}

/**
 * `Set` 은 Firestore 가 못 담습니다. 배열로 눕혔다가 되살립니다 —
 * **이 두 함수 밖에서는 아무도 `flags` 모양을 몰라야 합니다.**
 */
function toPlain(s: GameState): Record<string, unknown> {
  return { ...s, flags: [...s.flags] };
}

function fromPlain(d: Record<string, unknown>): GameState {
  const flags = Array.isArray(d.flags) ? (d.flags as string[]) : [];
  const s = { ...(d as unknown as GameState), flags: new Set(flags) };
  // **회차 번호가 없는 옛 세이브**는 여기서 하나 붙여 줍니다. 그 판에서
  // 예전에 남긴 방명록 글은 옛 이름(`uid_칸_일자`)에 그대로 남아 목록에
  // 계속 보이고, 지울 수도 있습니다 — 다만 이어서 고치지는 못합니다.
  if (!s.runId) s.runId = `old${Math.random().toString(36).slice(2, 8)}`;
  return s;
}

function slotRef(uid: string, slot: SlotId) {
  const db = getDb();
  if (!db) return null;
  return doc(db, 'users', uid, 'saves', slot);
}

/** 지금 저장할 수 있는가 — 로그인과 설정이 둘 다 있어야 합니다 */
export function canSave(): boolean {
  return Boolean(currentSession() && getDb());
}

export async function saveTo(slot: SlotId, state: GameState): Promise<void> {
  const s = currentSession();
  const db = getDb();
  if (!s || !db) throw new Error('로그인이 필요합니다');
  const ref = slotRef(s.uid, slot);
  if (!ref) throw new Error('로그인이 필요합니다');

  await setDoc(ref, {
    state: toPlain(state),
    savedAt: serverTimestamp(),
    chapterDay: state.chapterDay,
    route: state.route,
    who: `${state.playerFamilyName}${state.playerGivenName}`,
  });

  // **가장 멀리 간 날짜는 회차를 넘어 남습니다** — 방명록에서 무엇까지
  // 보여줄지의 기준이라 세이브가 아니라 프로필에 둡니다 (TECH_DESIGN 4-2).
  const prof = doc(db, 'users', s.uid, 'meta', 'profile');
  const cur = await getDoc(prof);
  const maxDay = Math.max(state.chapterDay, (cur.data()?.maxDay as number) ?? 0);
  await setDoc(
    prof,
    { displayName: s.displayName, maxDay, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function loadFrom(slot: SlotId): Promise<GameState | null> {
  const s = currentSession();
  const ref = s && slotRef(s.uid, slot);
  if (!ref) return null;
  const snap = await getDoc(ref);
  const data = snap.data();
  if (!data?.state) return null;
  return fromPlain(data.state as Record<string, unknown>);
}

/**
 * 칸을 비웁니다. **문서를 지웁니다** — 빈 값으로 덮으면 목록에 「이름 없는
 * 세이브」가 남아, 지운 것과 안 쓴 것이 구분이 안 됩니다.
 *
 * 도감(`profile.seenCG`)은 안 건드립니다 — 회차를 넘어 남는 값이라
 * 세이브와 함께 사라지면 안 됩니다 (TECH_DESIGN 4-2).
 */
export async function deleteSlot(slot: SlotId): Promise<void> {
  const s = currentSession();
  const ref = s && slotRef(s.uid, slot);
  if (!ref) throw new Error('로그인이 필요합니다');
  await deleteDoc(ref);
}

export async function listSlots(): Promise<SlotInfo[]> {
  const s = currentSession();
  const db = getDb();
  if (!s || !db) return [];
  const snap = await getDocs(collection(db, 'users', s.uid, 'saves'));
  const found = new Map<string, SlotInfo>();
  for (const d of snap.docs) {
    const v = d.data();
    found.set(d.id, {
      slot: d.id as SlotId,
      // serverTimestamp 는 서버가 찍기 전까지 null 일 수 있습니다
      savedAt: v.savedAt?.toDate?.() ?? null,
      chapterDay: (v.chapterDay as number) ?? 1,
      route: (v.route as RouteId | null) ?? null,
      who: (v.who as string) ?? '',
    });
  }
  return SLOTS.map(
    (slot) =>
      found.get(slot) ?? { slot, savedAt: null, chapterDay: 0, route: null, who: '' },
  );
}

/** 그 계정이 가장 멀리 간 날 — 타이틀에서 방명록을 열 때의 기준 */
export async function maxDay(): Promise<number> {
  const s = currentSession();
  const db = getDb();
  if (!s || !db) return 0;
  const snap = await getDoc(doc(db, 'users', s.uid, 'meta', 'profile'));
  return (snap.data()?.maxDay as number) ?? 0;
}
