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
import { HEROINE_BY_NAME, THEME } from '../core/types';
import type { FreeroamNpc, MapId } from '../core/types';
import { CAST, CELL, DIR_ROW, HEAD_OVERHANG, PLAYER_DOT, type Dir } from './sprites';

const TS = 48;
const ALL_MAPS: MapId[] = [
  'm1_basecamp_4f', 'm2_basecamp_2f', 'm3_basecamp_1f', 'm4_basecamp_b1',
  'm5_connect_garden', 'm6_nestcamp', 'm7_gate',
];
const SPEED = 190;
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
};

/** 그 인물의 테마 컬러 — 히로인이 아니면 중립색 */
function npcTheme(who: string): string {
  const id = HEROINE_BY_NAME[who];
  return id ? THEME[id] : '#c9b8a8';
}

export type MiniData = {
  w: number;
  h: number;
  blocked: boolean[];
  stairs: { x: number; y: number; dir: 'down' | 'up' | null }[];
  npcs: { x: number; y: number; theme: string }[];
};

const asset = (p: string): string => `${import.meta.env.BASE_URL}assets/${p}`;

export class CampusScene extends Phaser.Scene {
  private setup!: RoamSetup;
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private lighting!: LightingOverlay;
  private npcSprites: { npc: FreeroamNpc; sprite: Phaser.GameObjects.Image; mark: Phaser.GameObjects.Text }[] = [];
  /** 이미 만난 사람 — 자리에는 남지만 말은 못 겁니다 */
  private stayed: Phaser.GameObjects.Image[] = [];
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
  private portals: {
    rect: Phaser.Geom.Rectangle;
    to: MapId;
    sx: number;
    sy: number;
    /** 내려가는 계단은 위에서만, 올라가는 계단은 아래에서만 들어갑니다 */
    dir: 'down' | 'up' | null;
    mark?: Phaser.GameObjects.Text;
  }[] = [];
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
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    if (this.setup.still) {
      this.loadMap(this.setup.map, this.setup.x, this.setup.y);
      return;
    }
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

    this.loadMap(this.setup.map, this.setup.x, this.setup.y);
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
      npcs: this.npcSprites.map((n) => ({
        x: n.sprite.x / TS,
        y: n.sprite.y / TS,
        theme: npcTheme(n.npc.who),
      })),
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
    this.placeNpcs(map, id);
    this.lighting.attach(map, 100);
    this.lighting.setTime(this.setup.time);
    this.lighting.applySaturation([ground, objects]);
    this.emitMinimap(map);

    // 트리거 맵에 진입하는 것만으로 발동하는 씬
    const trg = this.setup.triggers.find((t) => t.map === id);
    if (trg) this.time.delayedCall(400, () => this.setup.onTrigger(trg.target));
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
          .text(rect.centerX, rect.y - 6, dir === 'down' ? '▼' : '▲', {
            fontSize: '18px',
            color: '#7fe3d6',
            stroke: '#2a2632',
            strokeThickness: 4,
          })
          .setOrigin(0.5, 1)
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

  /** 자리는 맵의 `npc` 오브젝트가 `role` 로 갖고 있습니다 */
  private placeNpcs(map: Phaser.Tilemaps.Tilemap, id: MapId): void {
    for (const { sprite, mark } of this.npcSprites) {
      sprite.destroy();
      mark.destroy();
    }
    for (const sp of this.stayed) sp.destroy();
    this.npcSprites = [];
    this.stayed = [];
    const layer = map.getObjectLayer('npc');
    if (!layer) return;

    for (const n of this.setup.npcs) {
      if (n.map !== id) continue;
      const cast = CAST[n.who];
      if (!cast) continue;
      const obj = layer.objects.find(
        (o) => (o.properties as { name: string; value: string }[] | undefined)
          ?.find((p) => p.name === 'role')?.value === cast.role,
      );
      if (!obj) continue;
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
        .setDepth(60);
      this.tweens.add({
        targets: mark,
        y: mark.y - 7,
        duration: 620,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
      this.uiCam?.ignore([s, mark]);
      this.npcSprites.push({ npc: n, sprite: s, mark });
    }
  }

  /**
   * 이미 만난 사람은 **말을 못 걸게만** 합니다.
   * 사라지게 하면 대화할 때마다 사람이 하나씩 없어져 교육장이 비어 갑니다 —
   * 사양도 「상호작용 아이콘이 사라진다」이지 사람이 사라진다가 아닙니다.
   */
  removeNpc(who: string): void {
    const found = this.npcSprites.find((x) => x.npc.who === who);
    // 흐리게 하지 않습니다 — 말을 걸었다고 사람이 반투명해질 이유가 없습니다.
    // 말을 못 걸게 되는 것은 목록에서 빠지는 것으로 충분합니다.
    if (found) {
      found.mark.destroy();
      this.stayed.push(found.sprite);
    }
    this.npcSprites = this.npcSprites.filter((x) => x.npc.who !== who);
    this.setup.npcs = this.setup.npcs.filter((n) => n.who !== who);

    // 미니맵 자료는 맵을 읽을 때 한 번 만들어집니다. 사람이 빠지면
    // 다시 보내야 느낌표가 사라집니다.
    if (this.lastMini) {
      this.lastMini = {
        ...this.lastMini,
        npcs: this.npcSprites.map((n) => ({
          x: n.sprite.x / TS,
          y: n.sprite.y / TS,
          theme: npcTheme(n.npc.who),
        })),
      };
      this.onMini?.(this.lastMini);
    }
  }

  update(_t: number, dt: number): void {
    if (this.paused || this.setup.still) return;
    if (this.portalCooldown > 0) this.portalCooldown -= dt;
    const c = this.cursors;
    let vx = 0;
    let vy = 0;
    if (c.left.isDown) vx = -SPEED;
    else if (c.right.isDown) vx = SPEED;
    if (c.up.isDown) vy = -SPEED;
    else if (c.down.isDown) vy = SPEED;
    this.player.setVelocity(vx, vy);

    let dir: Dir | null = null;
    if (vx < 0) dir = 'left';
    else if (vx > 0) dir = 'right';
    else if (vy < 0) dir = 'up';
    else if (vy > 0) dir = 'down';
    if (dir) this.player.anims.play(`walk_${dir}`, true);
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
      const ok =
        !on ||
        !on.dir ||
        (on.dir === 'down' ? this.lastFeet.y <= on.rect.y : this.lastFeet.y >= on.rect.bottom);
      if (on && !ok) {
        this.player.setPosition(this.lastPos.x, this.lastPos.y);
        this.player.setVelocity(0, 0);
        return;
      }
      this.lastFeet = { x: feet.x, y: feet.y };
      this.lastPos = { x: this.player.x, y: this.player.y };
      const hit = ok ? on : undefined;
      if (hit) {
        this.hint.setVisible(false);
        this.loadMap(hit.to, Math.floor(hit.sx / TS), Math.floor(hit.sy / TS));
        return;
      }
    }

    // 가까운 NPC 하나를 잡아 안내를 띄웁니다
    const near = this.npcSprites
      .map((x) => ({
        ...x,
        d: Phaser.Math.Distance.Between(
          this.player.x, this.player.y, x.sprite.x, x.sprite.y,
        ),
      }))
      .filter((x) => x.d < REACH)
      .sort((a, b) => a.d - b.d)[0];

    for (const { npc, mark } of this.npcSprites) {
      mark.setText('!').setColor(npcTheme(npc.who)).setFontSize(20);
    }
    this.hint.setVisible(Boolean(near));
    if (near) {
      near.mark.setText('스페이스').setColor('#ffffff').setFontSize(13);
      this.hint.setText(`${near.npc.who} 에게 말을 겁니다 — 스페이스`);
      this.hint.setPosition(16, this.cameras.main.height - 34);
      if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
        this.setPaused(true);
        this.hint.setVisible(false);
        this.setup.onTalk(near.npc);
      }
    }
  }

  get mapId(): MapId {
    return this.currentMap;
  }
}
