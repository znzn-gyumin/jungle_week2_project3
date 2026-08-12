/**
 * 대사 씬 뒤에 깔리는 타일맵.
 *
 * [TECH_DESIGN 1절](../../docs/TECH_DESIGN.md#1-스택) 모드 표가 **캠퍼스 안 =
 * 캔버스 표시 · 배경 타일맵**이라고 정합니다. 자유 이동과 다른 점은 주인공도
 * 조작도 없다는 것뿐이라, 같은 Scene 을 `still` 로 씁니다.
 */
import Phaser from 'phaser';

import type { TimeOfDay } from '../config/lighting';
import type { MapId } from '../core/types';
import { CampusScene } from './CampusScene';
import { MAP_DESIGN } from './sprites';

export class Backdrop {
  private game: Phaser.Game | null = null;
  private at: string | null = null;

  constructor(private host: HTMLElement) {}

  show(map: MapId, x: number, y: number, time: TimeOfDay): void {
    const key = `${map}:${x},${y}:${time}`;
    if (key === this.at) return;
    this.at = key;
    this.destroy();
    this.host.hidden = false;
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: this.host,
      backgroundColor: '#0b0c17',
      pixelArt: true,
      // **NONE + CSS 늘리기.** FIT 은 부모의 화면상 크기를 재는데, 무대가
      // CSS transform 으로 이미 축소돼 있어 두 번 줄어듭니다. 캔버스를
      // 2560×1440 으로 고정하고 늘리는 일은 CSS 에 맡깁니다 — 무대와 같은
      // 16:9 라 늘려도 안 찌그러집니다.
      scale: { mode: Phaser.Scale.NONE, ...MAP_DESIGN },
      scene: CampusScene,
    });
    this.game.scene.start('campus', {
      map, x, y, npcs: [], triggers: [], gender: 'male', time, still: true,
      onTalk: () => {},
      onTrigger: () => {},
    });
  }

  hide(): void {
    this.at = null;
    this.destroy();
  }

  private destroy(): void {
    this.game?.destroy(true);
    this.game = null;
    this.host.hidden = true;
    this.host.replaceChildren();
  }
}
