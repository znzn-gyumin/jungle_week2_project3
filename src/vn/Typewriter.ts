/**
 * 타자 효과. 클릭하면 즉시 완성됩니다.
 *
 * 분당 약 15줄(≈375자/분)이 예산 기준이라([GAME_DESIGN 7-1]) 기본 속도를
 * 그보다 빠르게 두고, 읽는 사람이 클릭으로 앞지를 수 있게 합니다.
 */
export class Typewriter {
  private timer = 0;
  private full = '';
  private done = true;

  constructor(
    private el: HTMLElement,
    private msPerChar = 28,
  ) {}

  get finished(): boolean {
    return this.done;
  }

  run(text: string): void {
    this.stop();
    this.full = text;
    this.done = false;
    this.el.textContent = '';
    let i = 0;
    this.timer = window.setInterval(() => {
      // 공백은 한 박자로 묶어 넘깁니다 — 글자마다 끊으면 덜컹거립니다
      do {
        i++;
      } while (i < this.full.length && this.full[i - 1] === ' ');
      this.el.textContent = this.full.slice(0, i);
      if (i >= this.full.length) this.complete();
    }, this.msPerChar);
  }

  /** 남은 글자를 한 번에 붙입니다 */
  complete(): void {
    this.stop();
    this.el.textContent = this.full;
    this.done = true;
  }

  private stop(): void {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = 0;
  }
}
