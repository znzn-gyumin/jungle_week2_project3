/**
 * 치환 토큰.
 *
 * 정본: docs/TECH_DESIGN.md 3-2 · 호칭 4단계는 docs/CHARACTERS.md 2절
 */
import type { GameState, RouteId } from './types';

/** 마지막 글자의 받침 코드. 완성형이 아니면 0 */
export function 받침(name: string): number {
  const code = name.charCodeAt(name.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 ? code % 28 : 0;
}

/** 부를 때 — 그 자체로 부르는 말이라 뒤에 아무것도 안 붙습니다 */
export const 호격 = (n: string): string => n + (받침(n) ? '아' : '야');

/** 뒤에 관계어가 올 때 — 받침이 없으면 아무것도 안 붙습니다 */
export const 접미 = (n: string): string => n + (받침(n) ? '이' : '');

/**
 * 히로인이 주인공을 부르는 말. 호감도 구간 × 루트로 결정됩니다.
 * 값 자체가 다른 토큰을 품고 있어 치환이 한 번 더 돕니다.
 *
 * **김민규의 0~24 는 빈 문자열**입니다 — 안 부르는 게 이 루트의 출발점이고,
 * 그래서 그 구간 대사는 `| if affection>=25` 로 갈라 씁니다.
 */
const 호칭표: Record<RouteId, [string, string, string, string]> = {
  minah: ['야', '{P:성명}', '{P}', '{P:호격}'],
  seunghee: ['{P} 님', '{P} 님', '{P} 님', '{P:호격}'],
  yunjung: ['선배님', '{P} 선배', '{P:접미} 오빠', '{P:접미} 오빠'],
  mingyu: ['', '{P:성명}', '{P}', '{P:호격}'],
  seungmin: ['{P} 님', '{P:호격}', '{P:호격}', '우리 {P}'],
  yunho: ['선배님', '선배', '{P} 선배', '{P:접미} 누나'],
};

/** 0~24 / 25~49 / 50~79 / 80~ */
export function band(affection: number): 0 | 1 | 2 | 3 {
  if (affection < 25) return 0;
  if (affection < 50) return 1;
  if (affection < 80) return 2;
  return 3;
}

export function 호칭(s: GameState): string {
  return s.route ? 호칭표[s.route][band(s.affection)] : '';
}

/** `{P...}` 를 상태로 채웁니다. 호칭 값이 토큰을 품고 있어 두 번 돕니다. */
export function substitute(text: string, s: GameState): string {
  const given = s.playerGivenName;
  const table: Record<string, string> = {
    '{P}': given,
    '{P:성명}': s.playerFamilyName + given,
    '{P:호격}': 호격(given),
    '{P:접미}': 접미(given),
    '{P:호칭}': 호칭(s),
  };
  const once = (t: string) =>
    t.replace(/\{P(?::([^}|]+))?\}|\{P:([^}]*)\|([^}]*)\}/g, (whole, _a, left, right) => {
      if (left !== undefined) return s.playerGender === 'male' ? left : right;
      return table[whole] ?? whole;
    });
  return once(once(text)).replace(/\s{2,}/g, ' ').trim();
}
