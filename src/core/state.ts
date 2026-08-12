/**
 * GameState + 조건 판정.
 *
 * 정본: docs/TECH_DESIGN.md 5절 · 수치는 docs/GAME_DESIGN.md 2절
 * 세이브(Firestore)는 구현 5번이라 아직 메모리에만 있습니다.
 */
import type { GameState } from './types';

export function newGame(gender: 'male' | 'female'): GameState {
  return {
    playerGender: gender,
    playerFamilyName: '이',
    playerGivenName: gender === 'male' ? '도윤' : '도아',
    route: null,
    affection: 10, // 시작 10 (GAME_DESIGN 2-1)
    skill: 0,
    chapter: 0,
    chapterDay: 1,
    map: 'm1_basecamp_4f',
    pos: { x: 0, y: 0 },
    talksLeft: 0,
    metThisRoam: [],
    flags: new Set(),
    cursor: { sceneId: 'p_arrival', lineIndex: 0 },
  };
}

const clamp = (v: number) => Math.max(0, Math.min(100, v));

export function applyEffects(s: GameState, e: { affection?: number; skill?: number }): void {
  if (e.affection) s.affection = clamp(s.affection + e.affection);
  if (e.skill) s.skill = clamp(s.skill + e.skill);
}

/** `flag:이름` · `affection>=40` — @choice 와 줄 조건이 같은 문자열을 씁니다 */
export function testCond(cond: string | undefined, s: GameState): boolean {
  if (!cond) return true;
  if (cond.startsWith('flag:')) return s.flags.has(cond.slice(5));
  const m = /^(affection|skill)(>=|<=|>|<)(\d+)$/.exec(cond);
  if (!m) return true;
  const v = m[1] === 'affection' ? s.affection : s.skill;
  const n = Number(m[3]);
  switch (m[2]) {
    case '>=':
      return v >= n;
    case '<=':
      return v <= n;
    case '>':
      return v > n;
    default:
      return v < n;
  }
}

/** 엔딩 티어 (GAME_DESIGN 2-3) */
export function endingTier(s: GameState): 'true' | 'good' | 'normal' {
  if (s.affection >= 80) return s.skill >= 50 ? 'true' : 'good';
  if (s.affection >= 50) return 'good';
  return 'normal';
}
