/**
 * 방명록 — 교육장 화이트보드에 얹히는 커뮤니티.
 *
 * 정본: docs/TECH_DESIGN.md 4-3(구현) · docs/GAME_DESIGN.md 2-5(정책)
 *
 *     guestbook/{uid}_{회차}_{일자}
 *
 * **문서 ID 가 곧 규칙입니다.** 계정 · 회차 · 인게임 일자 셋을 이어
 * 붙였으므로, 같은 판 같은 날에는 아무리 눌러도 글이 하나뿐이고 덮어씁니다.
 * 새 판을 시작하거나 다음 챕터로 넘어가면 그때 비로소 새 자리가 생깁니다 —
 * 「이번 판, 이번 챕터에 남긴 한 줄」이 한 장씩 쌓이는 모양입니다.
 *
 * **칸 번호가 아니라 회차 번호입니다.** 칸으로 가르면 세이브를 지우고
 * 같은 칸에 새 판을 만들었을 때 옛 글을 덮어씁니다 — 판을 지워도 그때
 * 남긴 글은 그 판의 것이어야 합니다.
 *
 * 세는 것도 막는 것도 이 ID 하나로 끝납니다. 개수를 따로 세어 거절하는
 * 코드가 없다는 뜻이라, 클라이언트가 우회할 구멍도 없습니다.
 *
 * **날짜 해금은 클라이언트 필터입니다.** 서버가 「저 사람이 지금 며칠째인가」
 * 를 알 방법이 없고(그 값 자체를 클라이언트가 보냅니다), 우회해도 남의 글을
 * 조금 일찍 보는 것뿐이라 무해합니다 — TECH_DESIGN 4-3 에 그렇게 적혀 있습니다.
 */
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  where,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import { currentSession } from './auth';
import { getDb } from './firebase';
import type { GameState, RouteId } from './types';

/** 한 번에 불러오는 장수 — 스크롤이 바닥에 닿으면 다음 쪽을 잇습니다 */
export const PAGE = 20;

/** 글을 쓸 수 있는 시점은 넷뿐입니다 (자유 이동 셋 + 수료식) */
export const WRITE_DAYS = [1, 5, 8, 12] as const;

/** 140자. 화이트보드에 손으로 적는 분량입니다 */
export const BODY_MAX = 140;

/** 이름은 **게임에서 정한 것**입니다 — 12자면 「명진혁 코치」도 들어갑니다 */
export const WHO_MAX = 12;

export type Entry = {
  /** 문서 이름 — `{uid}_{회차}_{일자}`. 지울 때 이걸로 가리킵니다 */
  id: string;
  uid: string;
  /** 어느 회차에서 쓴 글인가 */
  runId: string;
  /** 화이트보드에 적히는 이름 — 게임에서 정한 성+이름 */
  who: string;
  /** 구글 계정 이름. **화면에는 안 씁니다** — 신원 확인용으로만 둡니다 */
  displayName: string;
  route: RouteId | null;
  inGameDay: number;
  body: string;
  updatedAt: Date | null;
};

/**
 * 지금 진행 일자로 **찍을 수 있는 날짜**.
 * D6 에 썼어도 방명록에는 D5 층에 붙습니다 — 층이 넷뿐이기 때문입니다.
 */
export function writableDay(chapterDay: number): number {
  let day: number = WRITE_DAYS[0];
  for (const d of WRITE_DAYS) if (d <= chapterDay) day = d;
  return day;
}

function col() {
  const db = getDb();
  return db ? collection(db, 'guestbook') : null;
}

/**
 * 그 사람 · 그 칸 · 그 날의 글 한 장을 가리키는 이름.
 * **보안 규칙도 같은 식으로 다시 계산해 봅니다** — 남의 자리에 못 씁니다.
 */
function noteId(uid: string, runId: string, day: number): string {
  return `${uid}_${runId}_${day}`;
}

/**
 * 내 진행 일자까지의 글만 봅니다. 챕터를 지날수록 남들의 글이 한 층씩
 * 드러나고, D12 에 닿으면 네 층이 한꺼번에 보입니다 (SCENARIO_OUTLINE 6절).
 */
export type Page = {
  entries: Entry[];
  /** 다음 쪽이 더 있는가 */
  more: boolean;
  /** 다음 쪽을 부를 때 그대로 넘깁니다 — 밖에서는 속을 안 봅니다 */
  cursor: unknown;
};

export async function listEntries(chapterDay: number, after?: unknown): Promise<Page> {
  const c = col();
  if (!c || !currentSession()) return { entries: [], more: false, cursor: null };
  const parts = [
    where('inGameDay', '<=', chapterDay),
    orderBy('inGameDay', 'desc'),
    orderBy('updatedAt', 'desc'),
    ...(after ? [startAfter(after as QueryDocumentSnapshot)] : []),
    limit(PAGE),
  ];
  return read(c, parts);
}

/**
 * **내가 쓴 글 전부.** 날짜 해금을 안 겁니다.
 *
 * 화이트보드는 「내 진행 일자까지」만 보여주는데, 그러면 D5 에 쓴 글을
 * D2 로 되돌아온 판에서는 볼 수도 지울 수도 없습니다. 남의 글을 미리
 * 보는 것이 아니라 **내가 쓴 것을 되찾는 일**이라 가릴 이유가 없습니다.
 */
export async function myEntries(after?: unknown): Promise<Page> {
  const s = currentSession();
  const c = col();
  if (!s || !c) return { entries: [], more: false, cursor: null };
  return read(c, [
    where('uid', '==', s.uid),
    orderBy('updatedAt', 'desc'),
    ...(after ? [startAfter(after as QueryDocumentSnapshot)] : []),
    limit(PAGE),
  ]);
}

async function read(
  c: ReturnType<typeof col> & object,
  parts: Parameters<typeof query> extends [unknown, ...infer R] ? R : never,
): Promise<Page> {
  const snap = await getDocs(query(c, ...parts));
  const entries = snap.docs.map((d) => {
    const v = d.data();
    return {
      id: d.id,
      uid: v.uid as string,
      runId: (v.runId as string) ?? '',
      who: (v.who as string) || (v.displayName as string) || '이름 없음',
      displayName: (v.displayName as string) ?? '',
      route: (v.route as RouteId | null) ?? null,
      inGameDay: (v.inGameDay as number) ?? 1,
      body: (v.body as string) ?? '',
      updatedAt: v.updatedAt?.toDate?.() ?? null,
    };
  });
  return {
    entries,
    // 한 쪽을 꽉 채워 왔으면 더 있을 수 있습니다
    more: snap.docs.length === PAGE,
    cursor: snap.docs.at(-1) ?? null,
  };
}

/**
 * **지금 판, 지금 날에** 내가 쓴 글. 있으면 새로 쓰는 게 아니라 고치는
 * 것입니다 — 다른 칸이나 다른 날에 쓴 글은 그대로 남습니다.
 */
export async function myEntry(state: GameState): Promise<Entry | null> {
  const s = currentSession();
  const c = col();
  if (!s || !c) return null;
  const id = noteId(s.uid, state.runId, writableDay(state.chapterDay));
  const snap = await getDoc(doc(c, id));
  const v = snap.data();
  if (!v) return null;
  return {
    id,
    uid: s.uid,
    runId: state.runId,
    who: (v.who as string) || (v.displayName as string) || '이름 없음',
    displayName: (v.displayName as string) ?? s.displayName,
    route: (v.route as RouteId | null) ?? null,
    inGameDay: (v.inGameDay as number) ?? 1,
    body: (v.body as string) ?? '',
    updatedAt: v.updatedAt?.toDate?.() ?? null,
  };
}

/**
 * 쓰거나 고칩니다. **고치면 날짜도 지금 시점으로 덮입니다** — 날짜는
 * 「처음 쓴 때」가 아니라 「마지막으로 쓴 때」입니다 (TECH_DESIGN 4-3).
 *
 * **화이트보드에 적히는 이름은 게임에서 정한 이름(`who`)입니다.** 구글
 * 계정 이름은 화면에 안 씁니다 — 12일을 그 이름으로 불린 사람이 남기는
 * 글인데 거기에 실명 계정이 뜨면 세계가 깨집니다.
 *
 * 다만 `displayName` 은 계속 같이 보냅니다. 규칙이 **토큰의 이름과 같은지**
 * 를 검사해 사칭을 막는 자리라, 빼면 그 방어선이 사라집니다.
 */
export async function writeEntry(state: GameState, body: string, who: string): Promise<void> {
  const s = currentSession();
  const c = col();
  if (!s || !c) throw new Error('로그인이 필요합니다');
  const text = body.trim().slice(0, BODY_MAX);
  if (!text) throw new Error('내용이 비어 있습니다');

  const name = who.trim().slice(0, WHO_MAX) || '이름 없음';
  const day = writableDay(state.chapterDay);
  const ref = doc(c, noteId(s.uid, state.runId, day));
  const had = await getDoc(ref);
  await setDoc(ref, {
    uid: s.uid,
    runId: state.runId,
    who: name,
    displayName: s.displayName,
    route: state.route,
    inGameDay: day,
    body: text,
    // 처음 쓴 때는 그대로 두고, 고칠 때는 updatedAt 만 새로 찍습니다
    createdAt: had.exists() ? had.data().createdAt : serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * 글 한 장을 지웁니다.
 *
 * **계정만 같으면 지웁니다** — 어느 칸에서 썼든, 어느 날 자리든 상관없이
 * 내가 쓴 것이면 됩니다. 쓰는 쪽은 「지금 판 지금 날」로 묶여 있지만
 * 지우는 쪽까지 묶으면, 예전 판에 남긴 글을 손댈 방법이 없어집니다.
 * (보안 규칙도 문서 이름 앞이 내 uid 인지만 봅니다.)
 */
export async function removeEntry(id: string): Promise<void> {
  const s = currentSession();
  const c = col();
  if (!s || !c) return;
  if (!id.startsWith(`${s.uid}_`)) throw new Error('내 글이 아닙니다');
  await deleteDoc(doc(c, id));
}
