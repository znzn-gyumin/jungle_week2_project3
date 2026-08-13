/**
 * 캠퍼스 도트 맵 — Phaser Scene 하나가 7개 맵을 전환하며 씁니다.
 *
 * 정본: docs/TECH_DESIGN.md 1절(하이브리드 구조) · 3-1 `@freeroam`
 *
 * 캔버스는 DOM VN 레이어 **아래**에 깔립니다. NPC 에게 말을 걸거나 트리거
 * 좌표에 들어가면 이벤트를 올려보내고, 씬 재생이 끝나면 제어가 돌아옵니다.
 */
import Phaser from 'phaser';

import { LightingOverlay, type TimeOfDay } from '../config/lighting';
import { themeOf } from '../core/types';
import type { FreeroamNpc, MapId } from '../core/types';
import { play as sfx, step as sfxStep } from '../audio/sfx';
import { backLine, openLine } from './chatter';
import { CAST, CELL, DIR_ROW, HEAD_OVERHANG, PLAYER_DOT, type Dir } from './sprites';

/**
 * 맵에 서는 **조연 도트**. 무명(mob_a·b·c)은 없습니다.
 *
 * 맵의 `npc` 레이어에는 교육장 지정석 스물넷이 그대로 적혀 있지만
 * (WORLD_BIBLE 4-2-2 정본이라 맵 데이터에서는 안 지웁니다), 화면에는
 * **이름이 있는 사람만** 세웁니다 — 히로인 · 조연 · 코치.
 */
const EXTRA_DOTS = ['jomin', 'taeyun', 'taeyeon', 'yeosanim', 'myeongjinhyeok'];

/**
 * 그 자리에 앉은 사람의 도트. **모르는 이름이면 빈 문자열**입니다 —
 * 공용 도트로 때우면 아무나 그 자리에 앉아 있는 것처럼 보입니다.
 */
function extraDot(labelText: string): string {
  if (labelText.includes('조민')) return 'jomin';
  if (labelText.includes('태윤')) return 'taeyun';
  if (labelText.includes('태연')) return 'taeyeon';
  if (labelText.includes('여사님')) return 'yeosanim';
  if (labelText.includes('코치')) return 'myeongjinhyeok';
  return '';
}

const TS = 48;
const ALL_MAPS: MapId[] = [
  'm1_basecamp_4f', 'm2_basecamp_2f', 'm3_basecamp_1f', 'm4_basecamp_b1',
  'm5_connect_garden', 'm6_nestcamp', 'm7_gate',
];
const SPEED = 228; // 걷기
const RUN = 1.4; // 시프트를 누르고 있을 때 — 걷기의 1.4배
/**
 * 도트가 48px 이라 1배는 시야가 너무 넓습니다.
 *
 * 정수가 아니면 타일 한 칸이 화면에서 72px 이
 * 되어 경계가 픽셀 사이에 걸릴 수 있어, 카메라와 렌더러 양쪽에 roundPixels 를 겁니다.
 * 배경으로만 쓰는 맵(still)도 같은 값을 씁니다 — 자유 이동과 배율이 다르면
 * 대화로 넘어갈 때 화면이 확 바뀝니다.
 */
const ZOOM = 2;
/** 말을 걸 수 있는 거리 — 한 칸 반 */
const REACH = TS * 1.5;

/** 층수 — 계단이 오르는 것인지 내려가는 것인지 여기서 나옵니다 */
const FLOOR: Partial<Record<MapId, number>> = {
  m4_basecamp_b1: -1,
  m3_basecamp_1f: 1,
  m2_basecamp_2f: 2,
  m1_basecamp_4f: 4,
};

export type RoamSetup = {
  map: MapId;
  x: number;
  y: number;
  npcs: FreeroamNpc[];
  triggers: { map: MapId; target: string }[];
  gender: 'male' | 'female';
  /** 대사 씬의 배경으로만 씁니다 — 주인공도 조작도 없습니다 */
  still?: boolean;
  time: TimeOfDay;
  /** 말을 걸었을 때 — 재생기가 씬을 틉니다 */
  onTalk: (npc: FreeroamNpc) => void;
  /** 트리거 맵에 들어갔을 때 */
  onTrigger: (target: string) => void;
  /** 화이트보드 앞에서 스페이스 — 방명록을 엽니다 (GAME_DESIGN 2-5) */
  onBoard?: () => void;
};

/** 그 인물의 테마 컬러 — 히로인이 아니면 중립색 */
/** 도트맵 머리 위 표시 — types.themeOf 한 군데만 봅니다 */
const npcTheme = themeOf;

export type MiniData = {
  w: number;
  h: number;
  blocked: boolean[];
  stairs: { x: number; y: number; dir: 'down' | 'up' | null }[];
  /** 화이트보드(방명록) — 미니맵에 흰 띠로 찍습니다 */
  boards: { x: number; y: number; w: number }[];
  npcs: { x: number; y: number; theme: string; met: boolean }[];
};

const asset = (p: string): string => `${import.meta.env.BASE_URL}assets/${p}`;

export class CampusScene extends Phaser.Scene {
  private setup!: RoamSetup;
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private lighting!: LightingOverlay;
  /**
   * 맵에 선 사람들. 표시가 곧 등급입니다.
   *   `!`   CG 컷 대화가 남음        met=false
   *   `○`   맵 대화만 됨             met=true  · chatOnly=false
   *   없음  말은 못 걸고 잡담만 함    chatOnly=true (무명)
   */
  private npcSprites: {
    npc: FreeroamNpc;
    sprite: Phaser.GameObjects.Image;
    mark: Phaser.GameObjects.Text;
    met: boolean;
    chatOnly?: boolean;
  }[] = [];
  /** 이미 만난 사람 — 자리에는 남지만 말은 못 겁니다 */
  private stayed: Phaser.GameObjects.Image[] = [];
  /**
   * **CG 컷을 이미 본 사람 → 그 사람의 한 마디 씬.**
   *
   * 맵을 옮기면 사람은 전부 다시 그려집니다. 만난 사실을 스프라이트에만
   * 담아 두면 계단 한 번에 지워져서, 돌아왔을 때 히로인 머리 위에 느낌표가
   * 되살아나거나 그 자리를 다른 도트가 차지합니다. 그래서 **씬이 들고**
   * 있다가 다시 그릴 때마다 얹습니다.
   */
  private idleOf = new Map<string, string>();
  /** 대화 횟수를 다 써서 남은 느낌표까지 내렸는가 — 이것도 맵을 넘어 남습니다 */
  private allMet = false;
  /** 미니맵에 동그라미로 남길 사람들 */
  private metMarks: { x: number; y: number; theme: string; met: boolean }[] = [];
  private hint!: Phaser.GameObjects.Text;
  /** 미니맵은 DOM 캔버스가 그립니다 — 게임 캔버스에 그리면 확대돼 뭉갭니다 */
  private onMini?: (d: MiniData) => void;
  private onWhere?: (x: number, y: number) => void;
  /** 연결되기 전에 만들어진 자료 — 붙는 순간 바로 넘깁니다 */
  private lastMini: MiniData | null = null;
  /** UI 전용 카메라 — 본 카메라의 줌을 안 따라갑니다 */
  private uiCam!: Phaser.Cameras.Scene2D.Camera;
  /** 안내는 DOM 으로 옮겼습니다 — Phaser Text 로는 요즘 UI 가 안 나옵니다 */
  private onGuide?: (lines: string[]) => void;
  private currentMap!: MapId;
  private paused = false;
  /** 지금 사정거리 안에 있는 사람 */
  private near: string | null = null;
  /** 이름이 붙은 구역들 — 같은 층 안에서도 어디인지 갈라 줍니다 */
  private zones: { rect: Phaser.Geom.Rectangle; label: string }[] = [];
  /**
   * 화이트보드 — 방명록이 얹히는 자리입니다.
   *
   * 맵의 `trigger` 레이어에 `kind=whiteboard` 로 이미 심어져 있습니다
   * (tools/tilegen/maps.py 의 M1). **새 공간을 안 만드는 게 요점**이라
   * 여기 좌표를 그대로 씁니다.
   */
  private boards: { rect: Phaser.Geom.Rectangle; mark: Phaser.GameObjects.Text }[] = [];
  /** 지금 떠 있는 말풍선 — 겹쳐 뜨지 않게 셉니다 */
  private bubbles: Phaser.GameObjects.Text[] = [];
  /** 잡담 차례. 매번 다른 말이 나오게 씨앗으로 씁니다. */
  private chatTurn = 0;
  private portals: {
    rect: Phaser.Geom.Rectangle;
    to: MapId;
    sx: number;
    sy: number;
    /** 내려가는 계단은 위에서만, 올라가는 계단은 아래에서만 들어갑니다 */
    dir: 'down' | 'up' | null;
    mark?: Phaser.GameObjects.Text;
  }[] = [];
  /**
   * 발소리 간격(ms). **걷는 속도에 맞춰 울려야** 발을 딛는 것처럼 들립니다 —
   * 고정 간격으로 두면 뛸 때 발이 미끄러지는 것처럼 어긋납니다.
   */
  private stepTimer = 0;
  /** 직전 프레임의 발 위치 — 어느 쪽에서 들어왔는지 판정합니다 */
  private lastFeet = { x: 0, y: 0 };
  /** 되돌릴 자리 — 계단을 반대 방향에서 밟으면 여기로 밀어냅니다 */
  private lastPos = { x: 0, y: 0 };
  /** 맵을 막 옮긴 직후에는 되돌아가는 포탈을 한 박자 무시합니다 */
  private portalCooldown = 0;
  /** 맵을 옮길 때 지워야 합니다 — 안 지우면 두 맵이 겹쳐 쌓이고 충돌체가 둘이 됩니다 */
  private layers: Phaser.Tilemaps.TilemapLayer[] = [];
  private collider: Phaser.Physics.Arcade.Collider | null = null;

  constructor() {
    super('campus');
  }

  init(setup: RoamSetup): void {
    this.setup = setup;
  }

  preload(): void {
    for (const t of ['edu_indoor', 'dorm_indoor', 'outdoor', 'meta']) {
      this.load.image(`tileset_${t}`, asset(`tilesets/tileset_${t}.png`));
    }
    // 일곱 맵을 다 읽습니다. 합쳐 164KB 이고, 안 읽은 맵으로 가는 계단은
    // 조용히 무시되므로 — 프롤로그처럼 여섯이 다 4층에 있는 날에도
    // 계단을 밟으면 실제로 내려갈 수 있어야 캠퍼스가 이어져 보입니다.
    for (const m of ALL_MAPS) this.load.tilemapTiledJSON(m, asset(`map/${m}.json`));

    const dots = new Set<string>([PLAYER_DOT[this.setup.gender]]);
    for (const n of this.setup.npcs) if (CAST[n.who]) dots.add(CAST[n.who].dot);
    // 맵 npc 레이어에 적힌 나머지 스물몇 명 — 말은 못 걸어도 자리에는
    // 있어야 합니다. 텅 빈 교육장은 캠프처럼 안 보입니다.
    for (const d of EXTRA_DOTS) dots.add(d);
    for (const d of dots) {
      this.load.spritesheet(`dot_${d}`, asset(`dot/walk/${d}.webp`), {
        frameWidth: CELL.w,
        frameHeight: CELL.h,
      });
    }
  }

  create(): void {
    // 도트는 안티에일리어싱이 들어 있어 LINEAR 로 켭니다 (assets/README)
    for (const key of this.textures.getTextureKeys()) {
      if (key.startsWith('dot_')) {
        this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
    }
    const dot = PLAYER_DOT[this.setup.gender];
    for (const [dir, row] of Object.entries(DIR_ROW)) {
      this.anims.create({
        key: `walk_${dir}`,
        frames: [1, 2, 3].map((c) => ({ key: `dot_${dot}`, frame: row * 4 + c })),
        frameRate: 8,
        repeat: -1,
      });
    }

    this.lighting = new LightingOverlay(this);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.startChatter();
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.player = this.physics.add
      .sprite(0, 0, `dot_${dot}`, 0)
      .setOrigin(0, 0)
      .setDepth(50);
    // 발이 서 있는 한 칸만 충돌합니다 — 머리는 위 칸을 침범해도 됩니다
    this.player.body!.setSize(TS - 8, TS - 8).setOffset(4, HEAD_OVERHANG + 4);

    this.hint = this.add
      .text(0, 0, '', {
        fontSize: '13px',
        color: '#f2ede4',
        backgroundColor: 'rgba(11,12,23,.85)',
        padding: { x: 6, y: 3 },
      })
      .setDepth(200)
      .setScrollFactor(0)
      .setVisible(false);

    this.uiCam = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.uiCam.setName('ui');
    this.cameras.main.ignore(this.hint);
    // 주인공을 UI 카메라에서 빼야 합니다 — 안 그러면 화면에 둘로 보입니다
    this.uiCam.ignore(this.player);
    this.scale.on('resize', (g: Phaser.Structs.Size) => this.uiCam?.setSize(g.width, g.height));

    // 배경으로만 쓰는 맵도 주인공을 세웁니다 — 사람이 없으면 같은 자리인데도
    // 자유 이동과 다른 화면처럼 보입니다.
    if (this.setup.still) {
      this.hint.setVisible(false);
      this.player.body!.enable = false;
    }
    this.loadMap(this.setup.map, this.setup.x, this.setup.y);
  }

  /**
   * 할 이야기를 다 했습니다. 남은 사람들의 느낌표를 내립니다 —
   * 말은 계속 걸 수 있지만 이제 스토리가 아니라 한 마디씩입니다.
   */
  exhaust(): void {
    // 맵을 옮겨도 남아야 합니다 — 안 그러면 계단 한 번에 느낌표가 되살아납니다
    this.allMet = true;
    for (const n of this.npcSprites) {
      if (n.met) continue;
      n.met = true;
      n.mark.setVisible(false);
      this.metMarks.push({
        x: n.sprite.x / TS,
        y: n.sprite.y / TS,
        theme: npcTheme(n.npc.who),
        met: true,
      });
    }
    if (this.lastMini) {
      this.lastMini = { ...this.lastMini, npcs: this.miniNpcs() };
      this.onMini?.(this.lastMini);
    }
  }

  /** 지금 무엇을 하면 이야기가 진행되는지 */
  setGuide(lines: string[]): void {
    this.onGuide?.(lines);
  }

  bindMini(mini: (d: MiniData) => void, where: (x: number, y: number) => void): void {
    this.onMini = mini;
    this.onWhere = where;
    // loadMap 은 create() 안에서 이미 끝났습니다. 들고 있던 자료를 지금 넘깁니다.
    if (this.lastMini) mini(this.lastMini);
  }

  /**
   * 미니맵에 찍을 사람 — **표시는 셋으로만 갈립니다.**
   *
   *   `!`   CG 컷 대화가 남은 사람        met=false (setup.npcs 에서 온 사람만)
   *   `○`   말은 걸리지만 CG 는 없는 사람  metMarks
   *   없음  혼잣말·잡담만 하는 무명        chatOnly — 목록에 아예 안 넣습니다
   *
   * **한 군데서만 만듭니다.** 세 곳(맵 진입 · 대화 종료 · exhaust)이
   * 각자 목록을 짜면 한 곳만 규칙이 어긋나도 무명 머리에 느낌표가 뜹니다.
   */
  private miniNpcs(): MiniData['npcs'] {
    return [
      ...this.npcSprites
        .filter((n) => !n.met && !n.chatOnly)
        .map((n) => ({
          x: n.sprite.x / TS,
          y: n.sprite.y / TS,
          theme: npcTheme(n.npc.who),
          met: false,
        })),
      ...this.metMarks,
    ];
  }

  /** 미니맵이 그릴 자료 — 막힌 칸 · 계단 · 아직 안 만난 사람 */
  private emitMinimap(map: Phaser.Tilemaps.Tilemap): void {
    const blocked: boolean[] = [];
    const col = map.getLayer('collision')?.tilemapLayer;
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        blocked.push((col?.getTileAt(x, y)?.index ?? 0) > 0);
      }
    }
    this.lastMini = {
      w: map.width,
      h: map.height,
      blocked,
      stairs: this.portals.map((p) => ({ x: p.rect.x / TS, y: p.rect.y / TS, dir: p.dir })),
      // 방명록이 어디 있는지는 지도에서 보여야 합니다 — 자유 이동에서만
      // 열리는 자리라, 못 찾으면 있는 줄도 모릅니다
      boards: this.boards.map((b) => ({
        x: b.rect.x / TS,
        y: b.rect.y / TS,
        w: b.rect.width / TS,
      })),
      npcs: this.miniNpcs(),
    };
    this.onMini?.(this.lastMini);
  }

  /** 씬 재생 중에는 맵을 멈춥니다 */
  setPaused(v: boolean): void {
    this.paused = v;
    this.player.setVelocity(0, 0);
    if (v) this.player.anims.stop();
  }

  private loadMap(id: MapId, tx: number, ty: number): void {
    this.collider?.destroy();
    this.collider = null;
    for (const l of this.layers) l.destroy();
    this.layers = [];

    this.currentMap = id;
    const map = this.make.tilemap({ key: id });
    const sets = map.tilesets.map((ts) => map.addTilesetImage(ts.name, ts.name)!);
    const ground = map.createLayer('ground', sets, 0, 0)!;
    const objects = map.createLayer('objects', sets, 0, 0)!;
    const collision = map.createLayer('collision', sets, 0, 0)!.setVisible(false);
    collision.setCollisionByExclusion([-1, 0]);
    ground.setDepth(0);
    objects.setDepth(10);

    this.layers = [ground, objects, collision];
    this.uiCam?.ignore(this.layers);
    this.collider = this.physics.add.collider(this.player, collision);
    this.player.setPosition(tx * TS, ty * TS - HEAD_OVERHANG);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.player.setCollideWorldBounds(true);

    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.setZoom(ZOOM);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.collectPortals(map);
    this.collectBoards(map);
    this.placeNpcs(map, id);
    this.lighting.attach(map, 100);
    this.lighting.setTime(this.setup.time);
    this.lighting.applySaturation([ground, objects]);
    // 조명은 월드에 고정입니다 — UI 카메라가 한 벌 더 그리면 화면에 붙어
    // 인물을 따라다니는 것처럼 보입니다.
    this.uiCam?.ignore(this.lighting.layers);
    this.emitMinimap(map);

    // 트리거 맵에 진입하는 것만으로 발동하는 씬
    const trg = this.setup.triggers.find((t) => t.map === id);
    if (trg && !this.setup.still) {
      this.time.delayedCall(400, () => this.setup.onTrigger(trg.target));
    }
  }

  /** 계단·문 — `spawnX/Y` 는 도착 맵의 월드 픽셀(타일 중심)입니다 */
  private collectPortals(map: Phaser.Tilemaps.Tilemap): void {
    for (const p of this.portals) p.mark?.destroy();
    this.portals = [];
    for (const o of map.getObjectLayer('portal')?.objects ?? []) {
      const props = (o.properties as { name: string; value: string | number }[] | undefined) ?? [];
      const get = (k: string) => props.find((x) => x.name === k)?.value;
      const to = get('to') as MapId | undefined;
      if (!to || !this.cache.tilemap.has(to)) continue;
      const here = FLOOR[this.currentMap];
      const there = FLOOR[to];
      const dir =
        here !== undefined && there !== undefined && here !== there
          ? there < here
            ? ('down' as const)
            : ('up' as const)
          : null;
      const rect = new Phaser.Geom.Rectangle(o.x ?? 0, o.y ?? 0, o.width || TS, o.height || TS);

      // 화살표를 느낌표와 같은 방식으로 띄웁니다
      let mark: Phaser.GameObjects.Text | undefined;
      if (dir) {
        mark = this.add
          // 들어가는 쪽에 답니다. 내려가는 계단은 위에서, 올라가는 계단은
          // 아래에서 들어가므로 ▲ 는 칸 아래에 붙습니다.
          .text(rect.centerX, dir === 'down' ? rect.y - 6 : rect.bottom + 6, dir === 'down' ? '▼' : '▲', {
            fontSize: '18px',
            color: '#7fe3d6',
            stroke: '#2a2632',
            strokeThickness: 4,
          })
          .setOrigin(0.5, dir === 'down' ? 1 : 0)
          .setDepth(60);
        this.tweens.add({
          targets: mark,
          y: mark.y - 7,
          duration: 620,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.inOut',
        });
        this.uiCam?.ignore(mark);
      }
      this.portals.push({
        rect,
        to,
        sx: Number(get('spawnX') ?? 0),
        sy: Number(get('spawnY') ?? 0),
        dir,
        mark,
      });
    }
    this.portalCooldown = 500;
  }

  /**
   * 화이트보드 자리를 모읍니다 — 맵의 `trigger` 중 `kind=whiteboard`.
   *
   * 안내는 **가까이 갔을 때만** 띄웁니다. 늘 떠 있으면 교육장 앞이
   * 표시로 덮여, 정작 말을 걸 사람의 느낌표가 안 보입니다.
   */
  private collectBoards(map: Phaser.Tilemaps.Tilemap): void {
    for (const b of this.boards) b.mark.destroy();
    this.boards = [];
    if (!this.setup.onBoard) return;
    for (const o of map.getObjectLayer('trigger')?.objects ?? []) {
      const props = (o.properties ?? []) as { name: string; value: string }[];
      if (props.find((p) => p.name === 'kind')?.value !== 'whiteboard') continue;
      const rect = new Phaser.Geom.Rectangle(
        o.x ?? 0, o.y ?? 0, o.width || TS, o.height || TS,
      );
      // **사람에게 다가갔을 때와 같은 표시입니다.** 하나는 상자에 담긴
      // 글씨, 하나는 테두리만 두른 글씨면 같은 「누르세요」인데 두 가지로
      // 보입니다 — 글꼴 · 색 · 테두리 · 떠오르는 움직임까지 맞춥니다.
      const mark = this.add
        .text(rect.centerX, rect.y - 6, '스페이스', {
          fontSize: '13px',
          color: '#ffffff',
          stroke: '#2a2632',
          strokeThickness: 4,
        })
        .setOrigin(0.5, 1)
        .setDepth(60)
        .setVisible(false);
      this.tweens.add({
        targets: mark,
        y: mark.y - 7,
        duration: 620,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
      this.uiCam?.ignore(mark);
      this.boards.push({ rect, mark });
    }
  }

  /** 자리는 맵의 `npc` 오브젝트가 `role` 로 갖고 있습니다 */
  private placeNpcs(map: Phaser.Tilemaps.Tilemap, id: MapId): void {
    for (const { sprite, mark } of this.npcSprites) {
      sprite.destroy();
      mark.destroy();
    }
    for (const sp of this.stayed) sp.destroy();
    this.npcSprites = [];
    this.stayed = [];
    this.metMarks = [];
    // 라벨이 붙은 구역을 담아 둡니다 — 택배보관소 · 그랩앤고 · 버스정류장
    this.zones = [];
    for (const o of map.getObjectLayer('trigger')?.objects ?? []) {
      const props = (o.properties ?? []) as { name: string; value: string }[];
      const lab = props.find((x) => x.name === 'label')?.value;
      if (!lab) continue;
      this.zones.push({
        rect: new Phaser.Geom.Rectangle(o.x ?? 0, o.y ?? 0, o.width || TS, o.height || TS),
        label: String(lab),
      });
    }

    const layer = map.getObjectLayer('npc');
    if (!layer) return;
    /** 말을 걸 수 있는 사람이 이미 앉은 자리 — 배경 인물은 여기를 피합니다 */
    const used = new Set<Phaser.Types.Tilemaps.TiledObject>();

    for (const n of this.setup.npcs) {
      if (n.map !== id) continue;
      const cast = CAST[n.who];
      if (!cast) continue;
      const obj = layer.objects.find(
        (o) => (o.properties as { name: string; value: string }[] | undefined)
          ?.find((p) => p.name === 'role')?.value === cast.role,
      );
      if (!obj) continue;
      // **CG 컷을 이미 본 사람도 자기 자리에 자기 도트로 섭니다.**
      // 만난 뒤 계단을 타고 돌아오면 그 자리에 무명이 앉아 있었습니다 —
      // 만난 사람을 setup.npcs 에서 빼 버려서, 아래의 배경 인물 고리가
      // 「임자 없는 자리」 로 보고 공용 도트를 얹었던 탓입니다.
      const done = this.allMet || this.idleOf.has(n.who);
      const npc = done ? { ...n, target: this.idleOf.get(n.who) ?? n.target } : n;
      const s = this.add
        .image(obj.x ?? 0, (obj.y ?? 0) - HEAD_OVERHANG, `dot_${cast.dot}`, 0)
        .setOrigin(0, 0)
        .setDepth(40);

      // 아직 안 만난 사람 머리 위에 표시를 띄웁니다 — 어디로 가야 하는지가
      // 화면에서 바로 읽혀야 합니다.
      const mark = this.add
        .text(s.x + TS / 2, s.y - 6, '!', {
          fontSize: '20px',
          // 그 인물의 테마 컬러 (CHARACTERS 2절)
          color: npcTheme(n.who),
          stroke: '#2a2632',
          strokeThickness: 4,
        })
        .setOrigin(0.5, 1)
        .setDepth(60)
        .setVisible(!done);
      this.tweens.add({
        targets: mark,
        y: mark.y - 7,
        duration: 620,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
      this.uiCam?.ignore([s, mark]);
      this.npcSprites.push({ npc, sprite: s, mark, met: done });
      // 이미 본 사람은 미니맵에 동그라미로 남습니다 (miniNpcs 주석의 둘째 줄)
      if (done) {
        this.metMarks.push({ x: s.x / TS, y: s.y / TS, theme: npcTheme(n.who), met: true });
      }
      used.add(obj);
    }

    // ---- 조연. CG 컷은 없지만 자리에는 있고, 말도 걸립니다.
    //
    // **무명은 세우지 않습니다.** 맵의 `npc` 레이어에는 교육장 지정석
    // 스물넷이 그대로 적혀 있지만(WORLD_BIBLE 4-2-2 정본이라 맵에서
    // 지우지 않습니다), 화면에 세우는 사람은 **이름이 있는 사람뿐**입니다
    // — 히로인 · 조연(조민 · 4조 대표 · 여사님) · 코치.
    let i = 0;
    for (const o of layer.objects) {
      if (used.has(o)) continue;
      const props = o.properties as { name: string; value: string }[] | undefined;
      const text = String(props?.find((p) => p.name === 'label')?.value ?? '');
      // 이름 없는 자리는 건너뜁니다 — 무명은 아예 안 나옵니다
      if (!text || text === '무명') continue;
      // **성별로 갈리는 자리는 배경으로 안 세웁니다.**
      // 「장윤정 / 장윤호」 처럼 적힌 자리는 이 회차에 누가 나오는지가
      // 정해져 있는데, 라벨의 앞뒤 순서가 남녀로 일정하지 않아 그냥
      // 앞의 이름을 쓰면 안 나오는 성별이 화면에 서 버립니다. 이런
      // 사람은 말을 걸 수 있는 쪽(setup.npcs)으로만 등장합니다.
      if (text.includes(' / ')) continue;
      // 주인공 자리는 비워 둡니다 — 안 그러면 자기 자신이 앉아 있습니다
      if (text.includes('주인공')) continue;
      // **2층의 이름 있는 자리는 건너뜁니다.** 조민 자리가 4층과 2층에
      // 다 적혀 있어서(그날 어디 있느냐로 갈리는 자리라) 그대로 그리면
      // 같은 사람이 두 층에 동시에 서 있게 됩니다. 4층 쪽을 씁니다.
      // 여사님(B1)처럼 한 곳에만 있는 사람은 그 자리에 그대로 섭니다.
      if (id === 'm2_basecamp_2f') continue;
      // 도트가 없는 이름은 안 세웁니다 — 공용 도트로 때우지 않습니다
      const dot = extraDot(text);
      if (!dot || !this.textures.exists(`dot_${dot}`)) continue;
      // **다들 아래만 보고 있으면 진열장 같습니다.** 맵에 적힌 dir 을
      // 따르고, 없으면 자리 순서로 네 방향을 돌려 씁니다.
      const face = String(props?.find((p) => p.name === 'dir')?.value ?? '') as Dir;
      const row = DIR_ROW[face] ?? DIR_ROW[(['down', 'left', 'right', 'up'] as Dir[])[i % 4]];
      i++;
      const sp = this.add
        .image(o.x ?? 0, (o.y ?? 0) - HEAD_OVERHANG, `dot_${dot}`, row * 4)
        .setOrigin(0, 0)
        .setDepth(38);
      this.uiCam?.ignore(sp);

      // **이 사람들도 말은 걸립니다.** 원 표시는 「대화 불가」 가 아니라
      // 「맵 대화만 된다」 는 뜻입니다 — 느낌표는 CG 컷이 남은 사람만.
      const mark = this.add
        .text(sp.x + TS / 2, sp.y - 6, '○', {
          fontSize: '15px',
          color: npcTheme(text),
          stroke: '#2a2632',
          strokeThickness: 4,
        })
        .setOrigin(0.5, 1)
        .setDepth(60)
        .setVisible(false);
      this.uiCam?.ignore(mark);
      this.npcSprites.push({
        npc: { who: text, map: id, target: '' } as FreeroamNpc,
        sprite: sp,
        mark,
        met: true,
      });
      this.metMarks.push({ x: sp.x / TS, y: sp.y / TS, theme: npcTheme(text), met: true });
    }
  }

  /**
   * 이미 만난 사람은 **말을 못 걸게만** 합니다.
   * 사라지게 하면 대화할 때마다 사람이 하나씩 없어져 교육장이 비어 갑니다 —
   * 사양도 「상호작용 아이콘이 사라진다」이지 사람이 사라진다가 아닙니다.
   */
  removeNpc(who: string, idle: string): void {
    // **자리에서 빼지 않습니다.** 예전에는 여기서 setup.npcs 에서도
    // 지웠는데, 그러면 맵을 옮겼다 돌아왔을 때 그 사람을 다시 그릴 근거가
    // 없어져 자리가 무명 도트에게 넘어갔습니다. 만난 사실만 적어 둡니다.
    this.idleOf.set(who, idle);
    const found = this.npcSprites.find((x) => x.npc.who === who);
    // 사람은 자리에 그대로 두고 **말 거는 곳만 바꿉니다** — 다시 걸면
    // 그 상황에 맞는 한 마디를 합니다.
    if (found) {
      found.mark.setVisible(false);
      found.npc = { who: found.npc.who, map: found.npc.map, target: idle };
      found.met = true;
      this.metMarks.push({
        x: found.sprite.x / TS,
        y: found.sprite.y / TS,
        theme: npcTheme(who),
        met: true,
      });
    }

    // 미니맵 자료는 맵을 읽을 때 한 번 만들어집니다. 사람이 빠지면
    // 다시 보내야 느낌표가 사라집니다.
    //
    // **여기서 목록을 새로 짜면 안 됩니다.** 남은 사람을 전부 met=false
    // 로 적던 때가 있었는데, 그러면 한 번 말을 걸 때마다 잡담만 하는
    // 무명들까지 미니맵에 느낌표를 답니다 — 규칙은 miniNpcs() 하나뿐입니다.
    if (this.lastMini) {
      this.lastMini = { ...this.lastMini, npcs: this.miniNpcs() };
      this.onMini?.(this.lastMini);
    }
  }

  update(_t: number, dt: number): void {
    if (this.paused || this.setup.still) return;
    if (this.portalCooldown > 0) this.portalCooldown -= dt;
    const c = this.cursors;
    const sp = c.shift.isDown ? SPEED * RUN : SPEED;
    let vx = 0;
    let vy = 0;
    if (c.left.isDown) vx = -sp;
    else if (c.right.isDown) vx = sp;
    if (c.up.isDown) vy = -sp;
    else if (c.down.isDown) vy = sp;
    this.player.setVelocity(vx, vy);

    let dir: Dir | null = null;
    if (vx < 0) dir = 'left';
    else if (vx > 0) dir = 'right';
    else if (vy < 0) dir = 'up';
    else if (vy > 0) dir = 'down';
    if (dir) {
      this.player.anims.play(`walk_${dir}`, true);
      this.player.anims.timeScale = c.shift.isDown ? RUN : 1;
      // 한 칸 갈 때마다 한 번 — 뛰면 그만큼 빨라집니다
      this.stepTimer -= dt * (c.shift.isDown ? RUN : 1);
      if (this.stepTimer <= 0) {
        sfxStep();
        this.stepTimer = 300;
      }
    }
    else if (this.player.anims.isPlaying) {
      const row = DIR_ROW[(this.player.anims.currentAnim?.key.slice(5) as Dir) ?? 'down'];
      this.player.anims.stop();
      this.player.setFrame(row * 4);
    }

    this.onWhere?.(this.player.x / TS, this.player.y / TS);

    // 계단을 밟으면 맵이 바뀝니다
    if (this.portalCooldown <= 0) {
      const feet = new Phaser.Geom.Point(this.player.x + TS / 2, this.player.y + HEAD_OVERHANG + TS / 2);
      const on = this.portals.find((p) => Phaser.Geom.Rectangle.ContainsPoint(p.rect, feet));
      // 내려가는 계단은 **위에서만**, 올라가는 계단은 **아래에서만** 들어갑니다.
      // 반대쪽에서 오면 벽처럼 막습니다 — 그냥 지나가게 두면 계단이 통로가 됩니다.
      // 화살표가 없는 세 면은 벽입니다. 직전 발 위치가 들어가는 면 **바깥**
      // 이어야 통과합니다 — 옆이나 반대편에서 오면 여기서 걸립니다.
      const ok =
        !on ||
        !on.dir ||
        (on.dir === 'down' ? this.lastFeet.y < on.rect.y : this.lastFeet.y > on.rect.bottom);
      if (on && !ok) {
        this.player.setPosition(this.lastPos.x, this.lastPos.y);
        this.player.setVelocity(0, 0);
        this.onWhere?.(this.player.x / TS, this.player.y / TS);
        return;
      }
      this.lastFeet = { x: feet.x, y: feet.y };
      this.lastPos = { x: this.player.x, y: this.player.y };
      const hit = ok ? on : undefined;
      if (hit) {
        // 층이 갈리면 계단, 같은 층 사이면 문입니다
        sfx(hit.dir ? 'stairs' : 'door');
        this.hint.setVisible(false);
        this.loadMap(hit.to, Math.floor(hit.sx / TS), Math.floor(hit.sy / TS));
        return;
      }
    }

    // 화이트보드가 사람보다 먼저입니다 — 교육장 앞에 붙어 있어 사람과
    // 사정거리가 겹칠 수 있는데, 보드 앞에 선 사람은 보드를 보러 온 것입니다.
    const fx = this.player.x + TS / 2;
    const fy = this.player.y + HEAD_OVERHANG + TS / 2;
    let atBoard = false;
    for (const b of this.boards) {
      // 네모의 가장 가까운 점까지의 거리 — 폭이 다섯 칸이라 중심으로 재면
      // 끝에 서 있을 때 안 잡힙니다
      const d = Phaser.Math.Distance.Between(
        fx, fy,
        Phaser.Math.Clamp(fx, b.rect.x, b.rect.right),
        Phaser.Math.Clamp(fy, b.rect.y, b.rect.bottom),
      );
      const near = d < REACH;
      b.mark.setVisible(near);
      if (near) atBoard = true;
    }
    if (atBoard && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      sfx('ui_talk');
      this.setPaused(true);
      this.setup.onBoard?.();
      return;
    }

    // 가까운 NPC 하나를 잡아 안내를 띄웁니다
    const near = this.npcSprites
      .filter((x) => !x.chatOnly)
      .map((x) => ({
        ...x,
        d: Phaser.Math.Distance.Between(
          this.player.x, this.player.y, x.sprite.x, x.sprite.y,
        ),
      }))
      .filter((x) => x.d < REACH)
      .sort((a, b) => a.d - b.d)[0];

    // 매 프레임 초기화합니다. 안 지우면 한 번 가까이 갔던 사람 머리 위에
    // 「스페이스」 가 그대로 남습니다.
    for (const { npc, mark, met } of this.npcSprites) {
      // **도트맵에는 느낌표만.** CG 컷이 남은 사람만 머리 위에 뜹니다 —
      // 예순 넘는 사람이 다 동그라미를 이고 있으면 화면이 표시로 덮여
      // 정작 가야 할 곳이 안 보입니다. 원은 미니맵에서만 씁니다.
      if (met) {
        mark.setVisible(false);
        continue;
      }
      mark.setVisible(true).setText('!').setColor(npcTheme(npc.who)).setFontSize(20);
    }
    // 왼쪽 아래 안내는 안 씁니다 — 머리 위에 「스페이스」 가 이미 떠
    // 있어 같은 말을 두 번 하는 셈이고, 미니맵·튜토리얼과도 겹칩니다.
    this.near = near ? near.npc.who : null;
    if (near) {
      near.mark.setVisible(true).setText('스페이스').setColor('#ffffff').setFontSize(13);
      if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
        sfx('ui_talk');
        this.setPaused(true);
        this.setup.onTalk(near.npc);
      }
    }
  }

  /**
   * 가까이 선 두 사람이 이따금 한 마디씩 주고받습니다. 스토리는 안
   * 건드리고 대사창도 안 엽니다 — 못 봐도 손해가 없는 배경음입니다.
   */
  private startChatter(): void {
    this.time.addEvent({
      delay: 7200,
      loop: true,
      callback: () => {
        if (this.paused || this.setup.still || this.bubbles.length) return;
        // 서로 가까운 짝을 찾습니다. 멀리 떨어져 소리치면 이상합니다.
        // 잡담은 무명끼리만 합니다. 말 걸 수 있는 사람이 혼자 떠들면
        // 「말 안 걸어도 되는 사람」 처럼 보입니다.
        const pool = this.npcSprites.filter((n) => n.chatOnly);
        const pairs: [number, number][] = [];
        for (let i = 0; i < pool.length; i++) {
          for (let j = i + 1; j < pool.length; j++) {
            const d = Phaser.Math.Distance.Between(
              pool[i].sprite.x, pool[i].sprite.y, pool[j].sprite.x, pool[j].sprite.y,
            );
            if (d < TS * 5) pairs.push([i, j]);
          }
        }
        if (!pairs.length) return;
        const [a, b] = pairs[this.chatTurn % pairs.length];
        const seed = this.chatTurn++;
        this.bubble(pool[a].sprite, openLine(pool[a].npc.who, seed, this.setup.time));
        this.time.delayedCall(2100, () => {
          if (this.paused) return;
          this.bubble(pool[b].sprite, backLine(pool[b].npc.who, seed, this.setup.time));
        });
      },
    });
  }

  /** 머리 위 말풍선 하나. 3초쯤 있다 스스로 사라집니다. */
  private bubble(at: Phaser.GameObjects.Image, text: string): void {
    const t = this.add
      .text(at.x + TS / 2, at.y - 14, text, {
        fontSize: '13px',
        color: '#2a2632',
        backgroundColor: '#fffdf8',
        padding: { x: 7, y: 4 },
        stroke: '#fffdf8',
        strokeThickness: 2,
      })
      .setOrigin(0.5, 1)
      .setDepth(62)
      .setAlpha(0)
      // **월드에 박아 둡니다.** UI 카메라가 한 벌 더 그리면 화면에 붙어
      // 주인공을 따라다닙니다 — 조명에서 이미 겪은 것과 같은 문제입니다.
      .setScrollFactor(1);
    this.uiCam.ignore(t);
    this.bubbles.push(t);
    this.tweens.add({ targets: t, alpha: 1, y: t.y - 6, duration: 220 });
    this.time.delayedCall(3000, () => {
      this.tweens.add({
        targets: t,
        alpha: 0,
        duration: 260,
        onComplete: () => {
          this.bubbles = this.bubbles.filter((x) => x !== t);
          t.destroy();
        },
      });
    });
  }

  get mapId(): MapId {
    return this.currentMap;
  }

  /** 지금 말을 걸 수 있는 사람 — 튜토리얼이 「다가가기」 를 확인합니다 */
  get nearWho(): string | null {
    return this.near;
  }

  /**
   * 지금 서 있는 구역 이름. 같은 층 안에서도 자리마다 다릅니다 —
   * 「교육동 1F · 로비」 가 아니라 「교육동 1F · 택배보관소」 처럼요.
   */
  get zone(): string {
    const px = this.player.x + TS / 2;
    const py = this.player.y + HEAD_OVERHANG + TS / 2;
    const z = this.zones.find((v) => Phaser.Geom.Rectangle.Contains(v.rect, px, py));
    return z ? z.label : '';
  }

  /** 지금 서 있는 칸 — 튜토리얼이 「걷기」 를 확인합니다 */
  get tile(): { x: number; y: number } {
    return { x: Math.round(this.player.x / TS), y: Math.round(this.player.y / TS) };
  }
}
