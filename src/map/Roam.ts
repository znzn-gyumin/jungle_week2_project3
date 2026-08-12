/**
 * 자유 이동 — VN 재생기와 Phaser 맵 사이의 다리.
 *
 * 정본: docs/TECH_DESIGN.md 3-1 `@freeroam`
 *
 * `limit` 만큼 대화하면 `after` 로 빠집니다. **이동 자체는 제한하지 않고
 * 대화 횟수만 셉니다.** 히로인과 대화하면 호감도 +6 이 자동으로 붙습니다.
 */
import Phaser from 'phaser';

import type { TimeOfDay } from '../config/lighting';
import { HEROINE_GENDER, type FreeroamNpc, type GameState, type Line } from '../core/types';
import { CampusScene } from './CampusScene';
import { scoutName } from './sprites';

type Block = Extract<Line, { t: 'freeroam' }>;

/** 자유 이동은 셋뿐입니다 — D1 16:30 낮 · D5 23:00 밤 · D8 저녁 (lighting.ts) */
const TIME: Record<string, TimeOfDay> = {
  prologue: 'day',
  midproject: 'night',
  finalprep: 'evening',
};

export class Roam {
  private game: Phaser.Game | null = null;
  private scene: CampusScene | null = null;
  private left: number;
  private met: string[] = [];

  constructor(
    private host: HTMLElement,
    private block: Block,
    private state: GameState,
    /** NPC 씬을 재생합니다. 끝나면 `resume()` 이 불립니다 */
    private onTalk: (target: string) => void,
    /** 대화 횟수를 다 쓰면 */
    private onDone: (target: string) => void,
  ) {
    this.left = block.limit;
  }

  start(): void {
    const npcs = this.usable();
    this.host.hidden = false;
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: this.host,
      backgroundColor: '#0b0c17',
      pixelArt: true, // 타일은 NEAREST — 도트만 따로 LINEAR 로 겁니다
      scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
      physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } },
      scene: CampusScene,
    });
    this.game.scene.start('campus', {
      map: this.block.spawn.map,
      x: this.block.spawn.x,
      y: this.block.spawn.y,
      npcs,
      triggers: this.block.triggers,
      gender: this.state.playerGender,
      time: TIME[this.block.id] ?? 'day',
      onTalk: (n: FreeroamNpc) => this.talk(n),
      onTrigger: (t: string) => this.trigger(t),
    });
    this.scene = this.game.scene.getScene('campus') as CampusScene;
  }

  /**
   * 배치되는 3인은 `playerGender` 의 **반대 성별**입니다.
   * 4조 대표는 반대로 주인공과 동성이라 이름이 갈립니다 (CHARACTERS 4절).
   */
  private usable(): FreeroamNpc[] {
    const scout = scoutName(this.state.playerGender);
    return this.block.npcs
      .filter((n) => !this.met.includes(n.who))
      .filter((n) => !n.heroine || HEROINE_GENDER[n.heroine] !== this.state.playerGender)
      .map((n) => (n.who === '태윤' ? { ...n, who: scout } : n));
  }

  private talk(n: FreeroamNpc): void {
    this.left--;
    this.met.push(n.who === '태연' ? '태윤' : n.who);
    this.scene?.removeNpc(n.who);
    this.host.hidden = true;
    this.onTalk(n.target);
  }

  private trigger(target: string): void {
    this.scene?.setPaused(true);
    this.host.hidden = true;
    this.onTalk(target);
  }

  /** 씬이 `-> back` 으로 끝나면 맵으로 돌아옵니다 */
  resume(): void {
    if (this.left <= 0 || !this.usable().length) return this.finish();
    this.host.hidden = false;
    this.scene?.setPaused(false);
  }

  private finish(): void {
    const after = this.block.after;
    this.destroy();
    this.onDone(after);
  }

  destroy(): void {
    this.game?.destroy(true);
    this.game = null;
    this.scene = null;
    this.host.hidden = true;
    this.host.replaceChildren();
  }
}
