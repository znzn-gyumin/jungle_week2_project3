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
    // 글자를 늘려가며 넣으면 한 줄이 두 줄이 되는 순간 칸이 덜컹 뜁니다.
    // 처음부터 **전체 문장을 깔아두고** 아직 안 온 부분만 투명하게 두면
    // 줄바꿈이 처음 모습 그대로 고정됩니다.
    this.paint(0);
    let i = 0;
    this.timer = window.setInterval(() => {
      // 공백은 한 박자로 묶어 넘깁니다 — 글자마다 끊으면 덜컹거립니다
      do {
        i++;
      } while (i < this.full.length && this.full[i - 1] === ' ');
      this.paint(i);
      if (i >= this.full.length) this.complete();
    }, this.msPerChar);
  }

  /** 남은 글자를 한 번에 붙입니다 */
  complete(): void {
    this.stop();
    this.paint(this.full.length);
    this.done = true;
  }

  /** 앞 `n` 글자만 보이게 칠합니다. 자리는 처음부터 전부 잡혀 있습니다. */
  private paint(n: number): void {
    this.el.textContent = '';
    const shown = document.createElement('span');
    shown.textContent = this.full.slice(0, n);
    const hidden = document.createElement('span');
    hidden.className = 'vn__ink--wait';
    hidden.textContent = this.full.slice(n);
    this.el.append(shown, hidden);
  }

  private stop(): void {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = 0;
  }
}
