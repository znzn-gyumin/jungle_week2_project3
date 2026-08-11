/**
 * jungLover — 조명 오버레이
 *
 * 팔레트 정본: docs/WORLD_BIBLE.md 8-1 · 구현: docs/reference/TILESET_MAP_HANDOFF.md 5절
 *
 * 타일맵은 **맵당 낮 기준 한 벌**뿐이고, 시간대는 그 위에 오버레이를 얹어 만든다.
 * 타일을 시간대별로 여러 벌 만들지 않는다.
 *
 * | 시간대 | 색                        | 블렌드      | 불투명도 | 추가                      |
 * |--------|---------------------------|-------------|----------|---------------------------|
 * | 낮     | #FFE6B8                   | soft-light  | 12%      | 채도 −10%                 |
 * | 저녁   | #E8763C → #2A3A63 그라데  | overlay     | 35%      | 창 쪽 주황, 안쪽 남색     |
 * | 밤     | #153A4A                   | multiply    | 45%      | 모니터 위치에 청록 발광   |
 * | 심야   | #0B1220                   | multiply    | 72%      | 점광원만 남김             |
 * | 여명   | #5B3E8C → #3E6BB0 그라데  | screen      | 42%      | M5 전용 · 선행 어둠·탈채도 |
 *
 * 심야를 72%까지 깊게 두는 것이 이 게임의 정체성이다. 캠퍼스 주변에 도시 불빛이 없고
 * 광원은 발밑 조명 · 건물 창 · 모니터 · 자판기뿐이라, 얼굴이 거의 안 보이는 어둠이 기본값.
 */

import Phaser from 'phaser';

export type TimeOfDay = 'day' | 'evening' | 'night' | 'deepnight' | 'dawn';

export interface LightingPreset {
  /** 단색 오버레이 색 (그라데이션이면 undefined) */
  color?: number;
  /** 세로 그라데이션 [위, 아래] */
  gradient?: [number, number];
  blend: Phaser.BlendModes;
  /** 0..1 */
  opacity: number;
  /** 타일맵 레이어에 걸 채도 보정. 음수면 채도를 뺀다. */
  saturation?: number;
  /**
   * 본 오버레이 **앞에** 깔 어둠. [색, 불투명도] · MULTIPLY.
   * 여명처럼 "해 뜨기 직전"인 시간대는 밝은 낮 화면에 screen 만 얹으면
   * 따뜻한 분홍이 되어 스펙(보라→파랑)과 반대로 나온다. 어둠을 먼저 깔아야 한다.
   */
  preDarken?: [number, number];
  /** 점광원을 어둠에서 파낼지 (심야·밤) */
  punchLights: boolean;
  /** 점광원 반경 배율 */
  lightScale: number;
  label: string;
}

export const LIGHTING: Record<TimeOfDay, LightingPreset> = {
  day: {
    color: 0xffe6b8,
    blend: Phaser.BlendModes.SOFT_LIGHT,
    opacity: 0.12,
    saturation: -0.1,
    punchLights: false,
    lightScale: 0,
    label: '낮',
  },
  evening: {
    gradient: [0xe8763c, 0x2a3a63], // 창 쪽 주황 → 안쪽 남색
    blend: Phaser.BlendModes.OVERLAY,
    opacity: 0.35,
    punchLights: false,
    lightScale: 0.6,
    label: '저녁',
  },
  night: {
    color: 0x153a4a,
    blend: Phaser.BlendModes.MULTIPLY,
    opacity: 0.45,
    punchLights: true,
    lightScale: 1.0,
    label: '밤 (23~01)',
  },
  deepnight: {
    color: 0x0b1220,
    blend: Phaser.BlendModes.MULTIPLY,
    opacity: 0.72, // ← 이 게임의 정체성
    punchLights: true,
    lightScale: 0.62, // 점광원만 남는다. 반경도 좁다.
    label: '심야 (02~03)',
  },
  dawn: {
    gradient: [0x5b3e8c, 0x3e6bb0], // 위 보라 → 아래 파랑
    blend: Phaser.BlendModes.SCREEN,
    opacity: 0.42,
    saturation: -0.6, // 여명은 색이 빠진다
    preDarken: [0x171326, 0.74], // 심야의 어둠이 아직 남아 있다
    punchLights: false,
    lightScale: 0.8,
    label: '여명 (04:30~) · M5 전용',
  },
};

/** 맵별로 주로 나오는 시간대. 맵 프로퍼티 `lighting` 과 같은 값. */
export const MAP_TIMES: Record<string, TimeOfDay[]> = {
  m1_basecamp_4f: ['day', 'evening', 'night', 'deepnight'],
  m2_basecamp_2f: ['day', 'deepnight'],
  m3_basecamp_1f: ['day', 'night'],
  m4_basecamp_b1: ['day', 'deepnight'],
  m5_connect_garden: ['night', 'deepnight', 'dawn'],
  m6_nestcamp: ['night'],
  m7_gate: ['day', 'night'],
};

/**
 * 플레이어가 직접 걸어다니는 시각은 셋뿐이다 — D1 16:30 낮 · D5 23:00 밤 · D8 저녁.
 * 이때는 캠퍼스 안 어디든 갈 수 있으므로 이 셋은 전 맵에 얹힐 수 있다.
 */
export const FREE_ROAM_TIMES: TimeOfDay[] = ['day', 'night', 'evening'];

/** 점광원 종류별 색과 반경(px). 심야에 남는 건 이것뿐이다. */
export const LIGHT_KINDS = {
  monitor: { color: 0x7fe3d6, radius: 130, intensity: 0.85 }, // 모니터 청록 발광
  vending: { color: 0xf2d9a0, radius: 150, intensity: 0.95 }, // 자판기
  bollard: { color: 0xf2d9a0, radius: 120, intensity: 0.9 }, // 발밑 볼라드
  lamp: { color: 0xf2d9a0, radius: 110, intensity: 0.85 }, // 복도 발밑 조명
  window: { color: 0xbfd9e8, radius: 170, intensity: 0.6 }, // 건물 창
  ceiling: { color: 0xfff9e2, radius: 190, intensity: 0.75 }, // 매입 LED (낮/저녁만)
} as const;

export type LightKind = keyof typeof LIGHT_KINDS;

export interface LightSource {
  kind: LightKind;
  /** 월드 좌표(px) */
  x: number;
  y: number;
}

/**
 * 맵 오브젝트/타일에서 점광원을 뽑아낸다.
 * objects 레이어에서 자판기·볼라드·모니터 책상·조명 타일을 찾는 대신,
 * 맵 빌더가 넣어둔 trigger(kind='light')를 우선 쓰고, 없으면 이름으로 추정한다.
 */
export function collectLights(map: Phaser.Tilemaps.Tilemap): LightSource[] {
  const out: LightSource[] = [];
  const push = (kind: LightKind, x: number, y: number) => out.push({ kind, x, y });

  const objLayer = map.getObjectLayer('trigger');
  objLayer?.objects.forEach((o) => {
    const kind = (o.properties as any[])?.find((p) => p.name === 'light')?.value;
    if (kind) push(kind as LightKind, (o.x ?? 0) + 24, (o.y ?? 0) + 24);
  });

  // objects 타일 레이어에서 발광 타일을 직접 찾는다.
  // 타일셋 index.json 의 pieces 이름으로 gid 범위를 만들어 두고 쓰는 것이 정확하지만,
  // 런타임에서는 타일 프로퍼티 `light` 로 판정하는 편이 단순하다.
  const layer = map.getLayer('objects')?.tilemapLayer;
  layer?.forEachTile((t) => {
    const kind = t.properties?.light as LightKind | undefined;
    if (kind) push(kind, t.getCenterX(), t.getCenterY());
  });
  return out;
}

/**
 * 조명 오버레이 컨트롤러.
 * 씬에 하나만 두고 setTime() 으로 시간대를 바꾼다. 맵을 갈아끼워도 재사용한다.
 */
export class LightingOverlay {
  private scene: Phaser.Scene;
  /** 본 오버레이 (색·그라데이션 + 점광원 파내기) */
  private rt!: Phaser.GameObjects.RenderTexture;
  /** preDarken 용 선행 어둠 레이어 */
  private rtDark!: Phaser.GameObjects.RenderTexture;
  private gradKey = 'lighting-grad';
  private lightKey = 'lighting-radial';
  private current: TimeOfDay = 'day';
  private lights: LightSource[] = [];
  private width = 0;
  private height = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.ensureTextures();
  }

  /** 맵이 바뀔 때마다 호출 */
  attach(map: Phaser.Tilemaps.Tilemap, depth = 100) {
    this.width = map.widthInPixels;
    this.height = map.heightInPixels;
    this.lights = collectLights(map);
    this.rt?.destroy();
    this.rtDark?.destroy();
    // 선행 어둠이 아래(depth), 본 오버레이가 위
    this.rtDark = this.scene.add
      .renderTexture(0, 0, this.width, this.height)
      .setOrigin(0, 0)
      .setDepth(depth)
      .setScrollFactor(1);
    this.rt = this.scene.add
      .renderTexture(0, 0, this.width, this.height)
      .setOrigin(0, 0)
      .setDepth(depth + 1)
      .setScrollFactor(1);
    this.setTime(this.current);
  }

  setTime(t: TimeOfDay) {
    this.current = t;
    const p = LIGHTING[t];
    if (!this.rt) return;

    // ---- 1) 선행 어둠 (여명 전용)
    this.rtDark.clear();
    if (p.preDarken) {
      const [c, a] = p.preDarken;
      this.rtDark.setBlendMode(Phaser.BlendModes.MULTIPLY).setAlpha(a).setVisible(true);
      this.rtDark.fill(c, 1);
    } else {
      this.rtDark.setVisible(false);
    }

    // ---- 2) 본 오버레이
    this.rt.setBlendMode(p.blend);
    this.rt.setAlpha(p.opacity);
    this.rt.clear();

    if (p.gradient) {
      // 세로 그라데이션 — 4×256 캔버스 텍스처를 맵 전체로 늘려 그린다
      this.rebuildGradient(p.gradient);
      const img = this.scene.add
        .image(0, 0, this.gradKey)
        .setOrigin(0, 0)
        .setDisplaySize(this.width, this.height)
        .setVisible(false);
      this.rt.draw(img);
      img.destroy();
    } else {
      this.rt.fill(p.color!, 1);
    }

    // ---- 3) 점광원 — 어둠을 ERASE 로 파낸다. 심야에는 이 구멍만 남는다.
    if (p.punchLights && this.lights.length) {
      for (const l of this.lights) {
        const k = LIGHT_KINDS[l.kind];
        // 실내 천장등은 밤/심야에 꺼져 있다
        if (l.kind === 'ceiling' && (t === 'night' || t === 'deepnight')) continue;
        const r = k.radius * p.lightScale;
        const img = this.scene.add
          .image(l.x, l.y, this.lightKey)
          .setDisplaySize(r * 2, r * 2)
          .setAlpha(k.intensity)
          .setVisible(false);
        this.rt.erase(img);
        img.destroy();
      }
    }
  }

  /**
   * 채도 보정 — 낮 −10%, 여명 −60%.
   * Phaser 기본 파이프라인에 채도 셰이더가 없어 회백색 tint 로 근사한다.
   * 정확히 맞추려면 커스텀 파이프라인으로 교체할 것.
   */
  applySaturation(layers: Phaser.Tilemaps.TilemapLayer[]) {
    const p = LIGHTING[this.current];
    const amount = p.saturation ?? 0;
    layers.forEach((l) => {
      if (!amount) {
        l.clearTint();
        return;
      }
      const v = Math.round(255 * (1 + amount * 0.12));
      l.setTint(Phaser.Display.Color.GetColor(v, v, v));
    });
  }

  get time() {
    return this.current;
  }

  private ensureTextures() {
    const tx = this.scene.textures;
    if (!tx.exists(this.lightKey)) {
      // 부드러운 원형 마스크 — 점광원 파내기용
      const S = 128;
      const cv = tx.createCanvas(this.lightKey, S, S)!;
      const ctx = cv.getContext();
      const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.45, 'rgba(255,255,255,0.75)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S, S);
      cv.refresh();
    }
  }

  private rebuildGradient([top, bottom]: [number, number]) {
    const tx = this.scene.textures;
    if (tx.exists(this.gradKey)) tx.remove(this.gradKey);
    const H = 256;
    const cv = tx.createCanvas(this.gradKey, 4, H)!;
    const ctx = cv.getContext();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#' + top.toString(16).padStart(6, '0'));
    g.addColorStop(1, '#' + bottom.toString(16).padStart(6, '0'));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, H);
    cv.refresh();
  }
}

/* ---------------------------------------------------------------------------
사용 예 (CampusScene)

  private lighting!: LightingOverlay;

  create() {
    this.lighting = new LightingOverlay(this);
    this.loadMap('m1_basecamp_4f');
  }

  loadMap(key: string) {
    const map = this.make.tilemap({ key });
    const sets = map.tilesets.map(ts => map.addTilesetImage(ts.name, ts.name)!);
    const ground = map.createLayer('ground', sets, 0, 0)!;
    const objects = map.createLayer('objects', sets, 0, 0)!;
    const collision = map.createLayer('collision', sets, 0, 0)!;
    collision.setVisible(false);
    collision.setCollisionByExclusion([-1, 0]);   // 0 이 아닌 gid = 막힘
    this.physics.add.collider(this.player, collision);

    this.lighting.attach(map, 100);
    this.lighting.setTime('deepnight');
    this.lighting.applySaturation([ground, objects]);
  }

맵 프로퍼티 `lighting` 에 그 맵에서 쓸 시간대가 콤마로 들어 있다.
  const allowed = (map.properties as any[]).find(p => p.name === 'lighting').value.split(',');
--------------------------------------------------------------------------- */
