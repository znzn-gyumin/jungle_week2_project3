/**
 * 게임용 커서.
 *
 * 브라우저 기본 화살표는 미연시 화면에서 혼자 사무적입니다. 기본 커서를
 * 숨기고 링 하나를 따라다니게 한 뒤, 누르면 오므라들고 파문이 퍼지게
 * 합니다 — 클릭이 먹혔는지 눈으로 바로 확인됩니다.
 *
 * `position: fixed` 로 화면 좌표에 그립니다. 무대가 CSS transform 으로
 * 축소돼 있어도 커서는 그 영향을 안 받습니다.
 */
export function mountCursor(): void {
  const el = document.createElement('div');
  el.className = 'cursor';
  el.innerHTML = '<i class="cursor__dot"></i><i class="cursor__ring"></i>';
  document.body.append(el);
  document.body.classList.add('has-cursor');

  let x = innerWidth / 2;
  let y = innerHeight / 2;
  let rx = x;
  let ry = y;

  window.addEventListener('mousemove', (e) => {
    x = e.clientX;
    y = e.clientY;
    el.classList.remove('is-idle');
  });
  window.addEventListener('mouseleave', () => el.classList.add('is-idle'));
  window.addEventListener('mousedown', (e) => {
    el.classList.add('is-down');
    ripple(e.clientX, e.clientY);
  });
  window.addEventListener('mouseup', () => el.classList.remove('is-down'));

  // 링은 조금 늦게 따라옵니다 — 그 지연이 손맛을 만듭니다
  const loop = (): void => {
    rx += (x - rx) * 0.22;
    ry += (y - ry) * 0.22;
    el.style.setProperty('--x', `${x}px`);
    el.style.setProperty('--y', `${y}px`);
    el.style.setProperty('--rx', `${rx}px`);
    el.style.setProperty('--ry', `${ry}px`);
    requestAnimationFrame(loop);
  };
  loop();

  // 누를 만한 것 위에서는 링이 커집니다
  document.addEventListener('mouseover', (e) => {
    const t = e.target as HTMLElement;
    el.classList.toggle('is-hot', Boolean(t.closest('button, a, input, label, .vn__box')));
  });
}

/** 클릭한 자리에 파문 하나 */
function ripple(x: number, y: number): void {
  const r = document.createElement('span');
  r.className = 'cursor-ripple';
  r.style.left = `${x}px`;
  r.style.top = `${y}px`;
  document.body.append(r);
  setTimeout(() => r.remove(), 620);
}
