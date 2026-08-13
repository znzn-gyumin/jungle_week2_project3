/**
 * 엔딩 도감 — **모은 CG 는 회차를 넘어 남습니다.**
 *
 * 정본: docs/TECH_DESIGN.md 4-2 (`seenCG` 는 세이브가 아니라 `profile` 에)
 *
 * 세이브를 지우거나 새로 시작해도 도감은 그대로여야 합니다. 그래서 슬롯이
 * 아니라 계정 문서에 붙습니다.
 *
 * **로그인 전에도 굴러갑니다.** 데모로 둘러보는 동안 본 컷은 로컬에 쌓아
 * 두었다가, 로그인하면 그때 한 번에 밀어 넣습니다 — 안 그러면 로그인 전에
 * 본 엔딩이 통째로 사라집니다.
 */
import { arrayUnion, doc, getDoc, increment, setDoc } from 'firebase/firestore';

import { currentSession } from './auth';
import { getDb } from './firebase';
import { NAME_BY_HEROINE, type RouteId } from './types';

/**
 * 아무 루트에도 안 들어간 채로 12일이 끝났을 때 (`e_solo`).
 *
 * **도감에는 안 실립니다.** 회차 횟수를 세는 이름으로만 씁니다 — 이
 * 엔딩은 스틸이 없고, 무엇보다 `p_night` 의 선택지 여섯이 전부 루트를
 * 정하므로 지금 대본으로는 도달하는 길이 없습니다.
 */
export const BAD_ENDING = 'solo_ending';

/**
 * 도감에 실리는 여섯 장 — **루트마다 하나씩**.
 *
 * True 와 Good 이 같은 스틸을 쓰므로 한 루트에 한 자리입니다. Normal 은
 * 스틸이 없어 안 실립니다 — 없는 그림을 열 수는 없습니다.
 */
export const ENDINGS: {
  id: string;
  route: RouteId;
  who: string;
  /** `assets/` 아래 경로 */
  img: string;
}[] = [
  ...(['minah', 'seunghee', 'yunjung', 'mingyu', 'seungmin', 'yunho'] as RouteId[]).map(
    (route) => ({
      id: `${route}_ending`,
      route,
      who: NAME_BY_HEROINE[route],
      img: `cg/event/${route}_ending.webp`,
    }),
  ),
];

const LOCAL = 'junglover.seenCG';
/** 엔딩별로 몇 번 봤는가 — 도감과 달리 **다시 봐도 올라갑니다** */
const LOCAL_CLEARS = 'junglover.clears';

function localSeen(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function profileRef() {
  const s = currentSession();
  const db = getDb();
  return s && db ? doc(db, 'users', s.uid, 'meta', 'profile') : null;
}

/** 로그인 전에 본 것을 계정으로 옮깁니다 — 로그인 직후 한 번 */
export async function mergeLocal(): Promise<void> {
  const ref = profileRef();
  const mine = localSeen();
  if (!ref || !mine.length) return;
  await setDoc(ref, { seenCG: arrayUnion(...mine) }, { merge: true });
}

function localClears(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_CLEARS) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

export type Claim = {
  /** **도감에 자리가 있는 엔딩인가.** 스틸이 없는 Normal 과 솔로는 거짓 */
  inBook: boolean;
  /** **도감에 처음 실렸는가.** 두 번째 회차부터는 거짓입니다 */
  unlocked: boolean;
  /** 이 엔딩을 본 횟수 — 이번 것까지 셉니다 */
  clears: number;
};

/**
 * **엔딩 하나를 기록합니다.** 끝까지 본 순간에 한 번 부릅니다.
 *
 * 도감 등재를 `@cg` 가 뜨는 자리가 아니라 여기로 옮겼습니다 — 그림이
 * 스친 시점이 아니라 **끝까지 본 시점**이 수집한 때이고, 무엇보다
 * 「처음인가」를 물으려면 적어 넣기 **전에** 세어야 합니다.
 *
 * `key` 가 도감에 자리가 있는 값이면 해금이 걸리고, 아니면 횟수만
 * 올라갑니다 — Normal 엔딩이 그렇습니다. 그 엔딩은 스틸을 안 띄우므로
 * 도감에 넣으면 **플레이어가 본 적 없는 그림이 열립니다.**
 */
export async function claimEnding(key: string): Promise<Claim> {
  const inBook = ENDINGS.some((e) => e.id === key);
  const seen = await seenCG();
  const unlocked = inBook && !seen.has(key);

  const counts = localClears();
  let clears = (counts[key] ?? 0) + 1;

  const ref = profileRef();
  if (ref) {
    try {
      const snap = await getDoc(ref);
      const remote = (snap.data()?.clears as Record<string, number> | undefined) ?? {};
      // 계정이 정본입니다 — 기기를 옮겨도 횟수가 이어집니다
      clears = (remote[key] ?? 0) + 1;
      await setDoc(
        ref,
        { clears: { [key]: increment(1) }, ...(inBook ? { seenCG: arrayUnion(key) } : {}) },
        { merge: true },
      );
    } catch {
      /* 오프라인이면 로컬 값으로 갑니다 */
    }
  }
  counts[key] = clears;
  try {
    localStorage.setItem(LOCAL_CLEARS, JSON.stringify(counts));
    if (inBook) {
      const have = new Set(localSeen());
      have.add(key);
      localStorage.setItem(LOCAL, JSON.stringify([...have]));
    }
  } catch {
    /* 사생활 보호 모드 — 계정 쪽은 살아 있습니다 */
  }
  return { inBook, unlocked, clears };
}

/** 지금까지 모은 것 — 계정이 있으면 계정이 정본, 없으면 로컬 */
export async function seenCG(): Promise<Set<string>> {
  const ref = profileRef();
  if (!ref) return new Set(localSeen());
  try {
    const snap = await getDoc(ref);
    const remote = (snap.data()?.seenCG as string[] | undefined) ?? [];
    return new Set([...remote, ...localSeen()]);
  } catch {
    return new Set(localSeen());
  }
}
