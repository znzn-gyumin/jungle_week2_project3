import type { GameState } from '../core/types';

/**
 * 미연시 기본기 — 백로그 · 오토 · 스킵 · 글자 속도 · 호감도 게이지.
 *
 * 어느 것도 이야기를 바꾸지 않습니다. 읽는 속도와 되돌아보기를 사람이
 * 정하게 해줄 뿐이라, 스크립트를 한 줄도 안 건드리고 붙습니다.
 */
export class Hud {
  private log: { who: string; text: string }[] = [];
  private logEl: HTMLElement;
  private barEl: HTMLElement;
  private bar: HTMLElement;
  private btns: HTMLElement;
  private autoTimer = 0;
  private skipping = false;

  /** 자동으로 넘길 때 부릅니다 */
  auto = false;

  constructor(
    host: HTMLElement,
    private advance: () => void,
    private setSpeed: (ms: number) => void,
  ) {
    this.btns = document.createElement('div');
    this.btns.className = 'hud';
    this.btns.innerHTML = `
      <button type="button" data-act="log">기록</button>
      <button type="button" data-act="auto">오토</button>
      <button type="button" data-act="skip">스킵</button>
      <button type="button" data-act="speed">속도 보통</button>`;
    this.logEl = document.createElement('div');
    this.logEl.className = 'hud-log';
    this.logEl.hidden = true;
    this.barEl = document.createElement('div');
    this.barEl.className = 'hud-meter';
    this.barEl.innerHTML = '<span class="hud-meter__cap">호감</span><i></i>';
    this.bar = this.barEl.querySelector('i')!;
    host.append(this.btns, this.barEl, this.logEl);

    this.btns.addEventListener('click', (e) => {
      const act = (e.target as HTMLElement).dataset.act;
      if (act === 'log') this.toggleLog();
      if (act === 'auto') this.toggleAuto();
      if (act === 'skip') this.toggleSkip();
      if (act === 'speed') this.cycleSpeed();
    });
    this.logEl.addEventListener('click', () => this.toggleLog());
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.logEl.hidden) this.toggleLog();
      if (e.key.toLowerCase() === 'l') this.toggleLog();
      if (e.key.toLowerCase() === 'a') this.toggleAuto();
      if (e.key.toLowerCase() === 's') this.toggleSkip();
    });
  }

  /** 한 줄 읽을 때마다 부릅니다 */
  push(who: string, text: string): void {
    this.log.push({ who, text });
    if (this.log.length > 200) this.log.shift();
    if (!this.logEl.hidden) this.paintLog();
    // 오토·스킵은 줄이 바뀔 때마다 다음 예약을 겁니다
    window.clearTimeout(this.autoTimer);
    if (this.skipping) this.autoTimer = window.setTimeout(this.advance, 60);
    else if (this.auto) {
      const wait = 900 + text.length * 55;
      this.autoTimer = window.setTimeout(this.advance, wait);
    }
  }

  /** 호감도가 바뀔 때마다 부릅니다 */
  meter(s: GameState): void {
    // 100 이 만점입니다 ([GAME_DESIGN 4절])
    const pct = Math.max(0, Math.min(100, s.affection));
    this.bar.style.width = `${pct}%`;
    this.barEl.dataset.v = String(s.affection);
  }

  /** 선택지가 뜨면 오토·스킵을 멈춥니다 — 고르는 건 사람 몫입니다 */
  hold(): void {
    window.clearTimeout(this.autoTimer);
    this.auto = false;
    this.skipping = false;
    this.sync();
  }

  private toggleLog(): void {
    this.logEl.hidden = !this.logEl.hidden;
    if (!this.logEl.hidden) this.paintLog();
  }

  private paintLog(): void {
    this.logEl.innerHTML = this.log
      .map(
        (l) =>
          `<p>${l.who ? `<b>${l.who}</b>` : ''}<span>${l.text}</span></p>`,
      )
      .join('');
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }

  private toggleAuto(): void {
    this.auto = !this.auto;
    if (this.auto) this.skipping = false;
    else window.clearTimeout(this.autoTimer);
    this.sync();
  }

  private toggleSkip(): void {
    this.skipping = !this.skipping;
    if (this.skipping) this.auto = false;
    else window.clearTimeout(this.autoTimer);
    this.sync();
    if (this.skipping) this.advance();
  }

  private speed = 1;

  private cycleSpeed(): void {
    this.speed = (this.speed + 1) % 3;
    const ms = [46, 28, 12][this.speed];
    const name = ['느리게', '보통', '빠르게'][this.speed];
    this.setSpeed(ms);
    this.btns.querySelector<HTMLElement>('[data-act="speed"]')!.textContent = `속도 ${name}`;
  }

  private sync(): void {
    this.btns
      .querySelector('[data-act="auto"]')!
      .classList.toggle('is-on', this.auto);
    this.btns
      .querySelector('[data-act="skip"]')!
      .classList.toggle('is-on', this.skipping);
  }
}
