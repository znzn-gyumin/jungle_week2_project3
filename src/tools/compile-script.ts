/**
 * `.vns` → JSON 컴파일러 (Vite 플러그인)
 *
 * 문법 정본: docs/TECH_DESIGN.md 3-1
 *
 * `virtual:script` 를 import 하면 컴파일된 `ScriptData` 가 나옵니다.
 * 개발 중에는 `.vns` 를 고치면 그대로 다시 컴파일돼 화면이 갱신됩니다.
 */
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { Plugin } from 'vite';

import { HEROINE_BY_NAME } from '../core/types';
import type { ChoiceOption, Line, MapId, Scene, ScriptData } from '../core/types';
import type { TimeOfDay } from '../config/lighting';

/** `@time` 이 받는 값 — [lighting.ts](../config/lighting.ts) 의 다섯 시간대 */
const TIMES: string[] = ['day', 'evening', 'night', 'deepnight', 'dawn'];

const VIRTUAL = 'virtual:script';
const RESOLVED = '\0' + VIRTUAL;

export class VnsError extends Error {
  constructor(where: string, message: string) {
    super(`${where}  ${message}`);
    this.name = 'VnsError';
  }
}

const COND = /^(flag:\S+|(affection|skill)(>=|<=|>|<)\d+)$/;

/** `affection+7 skill-2` → { affection: 7, skill: -2 } */
function parseEffects(s: string): { affection?: number; skill?: number } {
  const out: { affection?: number; skill?: number } = {};
  for (const m of s.matchAll(/(affection|skill)([+-]\d+)/g)) {
    out[m[1] as 'affection' | 'skill'] = Number(m[2]);
  }
  return out;
}

/**
 * 선택지 한 줄. `|` 로 나뉜 칸의 **순서가 고정이 아닙니다** —
 * `"텍스트" | affection+7 | -> a | if affection>=80` 과
 * `"텍스트" | affection+7 | if flag:x | -> a` 가 둘 다 나옵니다.
 */
function parseOption(raw: string, where: string): ChoiceOption {
  const parts = raw.split('|').map((p) => p.trim());
  const text = parts[0].replace(/^"|"$/g, '');
  let target = '';
  let cond: string | undefined;
  let effects: ChoiceOption['effects'] = {};
  for (const p of parts.slice(1)) {
    if (p.startsWith('->')) target = p.slice(2).trim();
    else if (p.startsWith('if ')) cond = p.slice(3).trim();
    else if (p) effects = { ...effects, ...parseEffects(p) };
  }
  if (!target) throw new VnsError(where, `선택지에 점프 대상이 없습니다: ${text}`);
  if (cond && !COND.test(cond)) throw new VnsError(where, `조건 형식이 아닙니다: if ${cond}`);
  // 루트를 고르는 선택지는 대상 라벨이 route_<id> 입니다 (p_night)
  const m = /^route_(\w+)$/.exec(target);
  const heroine = m ? (m[1] as ChoiceOption['heroine']) : undefined;
  return { text, effects, ...(cond ? { cond } : {}), target, ...(heroine ? { heroine } : {}) };
}

export function compileVns(src: string, file: string): Scene[] {
  const scenes: Scene[] = [];
  let cur: Scene | null = null;
  const lines = src.split(/\r?\n/);

  for (let n = 0; n < lines.length; n++) {
    const raw = lines[n];
    const s = raw.trim();
    const where = `${file}:${n + 1}`;
    if (!s || s.startsWith('//')) continue;

    let m: RegExpExecArray | null;

    if ((m = /^===\s*(\S+)\s*===$/.exec(s))) {
      cur = { id: m[1], lines: [], labels: {} };
      scenes.push(cur);
      continue;
    }
    if (!cur) throw new VnsError(where, '씬 밖에 내용이 있습니다');

    if ((m = /^---\s*(\S+)\s*---$/.exec(s))) {
      cur.labels[m[1]] = cur.lines.length;
      continue;
    }

    // ---- @freeroam 은 들여쓴 여러 줄을 먹습니다
    if ((m = /^@freeroam\s+(\S+)/.exec(s))) {
      const block: Line = {
        t: 'freeroam',
        id: m[1],
        limit: 0,
        spawn: { map: 'm1_basecamp_4f', x: 0, y: 0 },
        npcs: [],
        triggers: [],
        after: '',
      };
      while (n + 1 < lines.length && /^\s+\S/.test(lines[n + 1])) {
        const b = lines[++n].trim().replace(/\s*#.*$/, '');
        let k: RegExpExecArray | null;
        if ((k = /^limit\s+(\d+)$/.exec(b))) block.limit = Number(k[1]);
        else if ((k = /^spawn\s+(\S+)\s+(\d+),(\d+)$/.exec(b)))
          block.spawn = { map: k[1] as MapId, x: Number(k[2]), y: Number(k[3]) };
        else if ((k = /^npc\s+(\S+)\s+at\s+(\S+)\s*->\s*(\S+)$/.exec(b)))
          block.npcs.push({
            who: k[1],
            map: k[2] as MapId,
            target: k[3],
            ...(HEROINE_BY_NAME[k[1]] ? { heroine: HEROINE_BY_NAME[k[1]] } : {}),
          });
        else if ((k = /^trigger\s+(\S+)\s*->\s*(\S+)$/.exec(b)))
          block.triggers.push({ map: k[1] as MapId, target: k[2] });
        else if ((k = /^after\s*->\s*(\S+)$/.exec(b))) block.after = k[1];
        else throw new VnsError(`${file}:${n + 1}`, `@freeroam 안에서 못 읽는 줄: ${b}`);
      }
      if (!block.after) throw new VnsError(where, '@freeroam 에 after 가 없습니다');
      cur.lines.push(block);
      continue;
    }

    // ---- @choice 는 따옴표로 시작하는 줄들을 먹습니다
    if (s === '@choice') {
      const options: ChoiceOption[] = [];
      while (n + 1 < lines.length && lines[n + 1].trim().startsWith('"')) {
        options.push(parseOption(lines[++n].trim(), `${file}:${n + 1}`));
      }
      if (!options.length) throw new VnsError(where, '@choice 에 선택지가 없습니다');
      cur.lines.push({ t: 'choice', options });
      continue;
    }

    // `@map 맵 x,y` — 캠퍼스 안 씬이 어느 자리를 비추는가
    if ((m = /^@map\s+(\S+)\s+(\d+),(\d+)$/.exec(s))) {
      cur.lines.push({ t: 'map', id: m[1] as MapId, x: Number(m[2]), y: Number(m[3]) });
      continue;
    }
    // `@time 시간대` — 곡이 시각을 못 말해 주는 자리에만 적습니다
    if ((m = /^@time\s+(\S+)$/.exec(s))) {
      if (!TIMES.includes(m[1]))
        throw new VnsError(where, `모르는 시간대: ${m[1]} (${TIMES.join(' · ')})`);
      cur.lines.push({ t: 'time', id: m[1] as TimeOfDay });
      continue;
    }
    if ((m = /^@(bg|bgm|se|cg)\s+(\S+)$/.exec(s))) {
      cur.lines.push({ t: m[1] as 'bg' | 'bgm' | 'se' | 'cg', id: m[2] });
      continue;
    }
    if (s === '@char none') {
      cur.lines.push({ t: 'charOut' });
      continue;
    }
    // `@char * 위치` — 공용 씬에서 현재 루트의 히로인을 세웁니다 (`-> r_*_` 와 같은 규칙)
    if ((m = /^@char\s+(\S+)\s+(left|center|right)$/.exec(s))) {
      cur.lines.push({ t: 'char', who: m[1], pos: m[2] as 'left' | 'center' | 'right' });
      continue;
    }
    if ((m = /^@flag\s+(set|clear)\s+(\S+)$/.exec(s))) {
      cur.lines.push({ t: 'flag', op: m[1] as 'set' | 'clear', id: m[2] });
      continue;
    }
    if ((m = /^->\s*(\S+)$/.exec(s))) {
      cur.lines.push({ t: 'jump', target: m[1] });
      continue;
    }
    if (s.startsWith('@')) throw new VnsError(where, `모르는 지시문: ${s}`);

    // ---- 대사·내레이션. 뒤에 「| if 조건」 이 붙을 수 있습니다
    let body = s;
    let cond: string | undefined;
    if ((m = /^(.*?)\s*\|\s*if\s+(\S+)$/.exec(s))) {
      body = m[1].trim();
      cond = m[2];
      if (!COND.test(cond)) throw new VnsError(where, `조건 형식이 아닙니다: if ${cond}`);
    }
    if (body.startsWith('*')) {
      cur.lines.push({ t: 'narr', text: body.slice(1).trim(), ...(cond ? { cond } : {}) });
      continue;
    }
    if ((m = /^(\S+)\s*(?:\[([^\]]+)\])?\s*"(.*)"$/.exec(body))) {
      cur.lines.push({
        t: 'say',
        who: m[1],
        ...(m[2] ? { face: m[2] } : {}),
        text: m[3],
        ...(cond ? { cond } : {}),
      });
      continue;
    }
    throw new VnsError(where, `못 읽는 줄: ${body}`);
  }
  return scenes;
}

async function collect(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await collect(p)));
    else if (e.name.endsWith('.vns')) out.push(p);
  }
  return out.sort();
}

export async function compileAll(dir: string): Promise<ScriptData> {
  const data: ScriptData = {};
  for (const f of await collect(dir)) {
    for (const sc of compileVns(await readFile(f, 'utf8'), f.replace(/\\/g, '/'))) {
      if (data[sc.id]) throw new VnsError(f, `씬 ID 가 겹칩니다: ${sc.id}`);
      data[sc.id] = sc;
    }
  }
  return data;
}

export function scriptPlugin(): Plugin {
  const dir = resolve(import.meta.dirname, '../script');
  return {
    name: 'junglover-script',
    resolveId: (id) => (id === VIRTUAL ? RESOLVED : undefined),
    async load(id) {
      if (id !== RESOLVED) return;
      const data = await compileAll(dir);
      return `export default ${JSON.stringify(data)};`;
    },
    configureServer(server) {
      server.watcher.add(dir);
      server.watcher.on('change', (p) => {
        if (!p.endsWith('.vns')) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      });
    },
  };
}
