/**
 * 타자 효과. 클릭하면 즉시 완성됩니다.
 *
 * 분당 약 15줄(≈375자/분)이 예산 기준이라([GAME_DESIGN 7-1]) 기본 속도를
 * 그보다 빠르게 두고, 읽는 사람이 클릭으로 앞지를 수 있게 합니다.
 *
 * **자리를 먼저 다 잡고 색만 채웁니다.** 글자를 하나씩 붙여 넣으면 한 줄이
 * 두 줄이 되는 순간 칸이 덜컹 뜁니다. 그래서 문장 전체를 처음부터 깔아
 * 두고 아직 안 온 글자만 투명하게 둡니다 — 줄바꿈이 첫 프레임 모습
 * 그대로 끝까지 고정됩니다.
 *
 * 글자 하나가 span 하나입니다. `.vn__ink` 에 걸린 색 트랜지션 덕에 글자가
 * **제자리에서 차오르듯** 켜지고, 트랜지션이 타자 간격보다 길어서 앞뒤
 * 글자가 겹쳐 켜집니다. 자리는 안 건드리므로 대사가 움직이지 않습니다.
 */
export class Typewriter {
  private timer = 0;
  private full = '';
  private done = true;
  /** 글자마다 span 하나 — 자리는 처음부터 잡혀 있고 색만 나중에 옵니다 */
  private chars: HTMLElement[] = [];
  /** 여기까지 켰습니다 */
  private shown = 0;

  constructor(
    private el: HTMLElement,
    private msPerChar = 28,
  ) {}

  /** 글자 속도를 바꿉니다 — 다음 줄부터 걸립니다 */
  setSpeed(ms: number): void {
    this.msPerChar = ms;
  }

  get finished(): boolean {
    return this.done;
  }

  run(text: string): void {
    this.stop();
    this.full = text;
    this.done = false;
    this.build();
    this.timer = window.setInterval(() => {
      let n = this.shown + 1;
      // 공백은 한 박자로 묶어 넘깁니다 — 글자마다 끊으면 덜컹거립니다
      while (n < this.chars.length && this.chars[n - 1].textContent === ' ') n++;
      this.reveal(n);
      if (this.shown >= this.chars.length) this.complete();
    }, this.msPerChar);
  }

  /** 남은 글자를 한 번에 켭니다 — 트랜지션이 있어 툭 튀지 않고 함께 차오릅니다 */
  complete(): void {
    this.stop();
    this.reveal(this.chars.length);
    this.done = true;
  }

  /**
   * 문장 전체를 깔아 둡니다. **한 덩이로 감싸서 넣습니다** — 대사 칸
   * (`.vn__text`)이 `display: grid` 라 자식을 그대로 넣으면 글자마다
   * 한 행씩 차지해 세로로 흩어집니다. 감싸 두면 그 안에서 평소처럼
   * 한 줄로 이어집니다.
   */
  private build(): void {
    const line = document.createElement('span');
    this.chars = [...this.full].map((ch) => {
      const s = document.createElement('span');
      s.className = 'vn__ink vn__ink--wait';
      s.textContent = ch;
      line.append(s);
      return s;
    });
    this.el.replaceChildren(line);
    this.shown = 0;
  }

  /** 앞 `n` 글자를 켭니다. 이미 켠 글자는 다시 안 건드립니다. */
  private reveal(n: number): void {
    for (; this.shown < n && this.shown < this.chars.length; this.shown++) {
      this.chars[this.shown].classList.remove('vn__ink--wait');
    }
  }

  private stop(): void {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = 0;
  }
}
