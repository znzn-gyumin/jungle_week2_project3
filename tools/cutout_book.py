#!/usr/bin/env python3
"""엔딩 도감 그림 두 장을 화면에 얹을 수 있게 다듬습니다.

    python tools/cutout_book.py
      assets/ui/book_outside.png →  assets/ui/book_cover.webp
      assets/ui/book_inside.png  →  assets/ui/book_spread.webp

받아온 그림은 **알파가 없고 배경이 흰색**입니다. 어두운 도감 화면에
그대로 얹으면 흰 판이 통째로 보입니다. 그래서 세 가지를 합니다.

  ① 배경을 뚫습니다 — 테두리에서 흘려 넣어(flood fill) 바깥쪽 흰 영역만
     지웁니다. 안쪽 종이(누런색)는 흰색과 충분히 멀어 안 지워집니다.
  ② 그림자를 살립니다 — 배경 영역이라도 밝기만큼 알파를 남겨, 책 아래
     그림자가 **어느 배경 위에서든** 자연스럽게 깔립니다.
  ③ 잘라내고 줄입니다 — 남은 여백을 떼고 긴 변을 1200px 로 맞춥니다.

**펼친 그림에서는 종이 두 쪽의 자리도 잽니다.** 그림 위에 글과 사진을
얹어야 하는데, 그 자리를 눈대중으로 %를 찍으면 창 크기가 바뀔 때마다
어긋납니다. 여기서 재서 출력한 값을 CSS 에 그대로 적습니다.
"""
from __future__ import annotations
import os
from collections import deque

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UI = os.path.join(ROOT, 'assets', 'ui')
MAXW = 1200
# 흰 배경의 잔 얼룩을 무시하는 폭 — 이만큼보다 어두워야 그림자로 봅니다
DEADZONE = 10


def cutout(im: Image.Image, tol: int = 46, feather: float = 70.0) -> Image.Image:
    """테두리에서 이어진 흰 배경을 뚫습니다. 그림자는 밝기만큼 남깁니다."""
    im = im.convert('RGBA')
    w, h = im.size
    px = im.load()
    r0, g0, b0, _ = px[0, 0]

    seen = bytearray(w * h)
    dq: deque[tuple[int, int]] = deque()
    for x in range(w):
        for y in (0, h - 1):
            dq.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            dq.append((x, y))

    while dq:
        x, y = dq.popleft()
        i = y * w + x
        if seen[i]:
            continue
        r, g, b, _ = px[x, y]
        if abs(r - r0) + abs(g - g0) + abs(b - b0) > tol:
            continue  # 책(또는 짙은 그림자) — 여기서 멈춥니다
        seen[i] = 1
        if x > 0: dq.append((x - 1, y))
        if x < w - 1: dq.append((x + 1, y))
        if y > 0: dq.append((x, y - 1))
        if y < h - 1: dq.append((x, y + 1))

    for y in range(h):
        for x in range(w):
            if not seen[y * w + x]:
                continue
            r, g, b, _ = px[x, y]
            lum = (r + g + b) / 3
            drop = (r0 + g0 + b0) / 3 - lum
            # **죽은구간이 필요합니다.** 원본 흰 배경에 한두 단계짜리 얼룩이
            # 있어서, 그걸 그대로 알파로 옮기면 책 둘레에 점이 자글자글 낍니다.
            if drop < DEADZONE:
                px[x, y] = (0, 0, 0, 0)
                continue
            # 흰색에서 멀수록(=그늘질수록) 더 남깁니다
            a = max(0.0, min(1.0, (drop - DEADZONE) / feather))
            px[x, y] = (60, 44, 30, int(a * 255))
    return im


def trim(im: Image.Image) -> Image.Image:
    box = im.getbbox()
    return im.crop(box) if box else im


def shrink(im: Image.Image) -> Image.Image:
    if im.width <= MAXW:
        return im
    k = MAXW / im.width
    return im.resize((MAXW, round(im.height * k)), Image.LANCZOS)


def pages(im: Image.Image) -> None:
    """펼친 그림에서 **종이 두 쪽**의 자리를 재서 % 로 찍습니다."""
    w, h = im.size
    px = im.load()

    def paper(x: int, y: int) -> bool:
        r, g, b, a = px[x, y]
        # 누런 종이 — 밝고 붉은 기가 도는 색
        return a > 200 and r > 150 and r - b > 22 and g > 130

    def box(x_from: int, x_to: int) -> tuple[int, int, int, int]:
        x0, y0, x1, y1 = x_to, h, x_from, 0
        for y in range(0, h, 2):
            for x in range(x_from, x_to, 2):
                if paper(x, y):
                    x0 = min(x0, x); y0 = min(y0, y)
                    x1 = max(x1, x); y1 = max(y1, y)
        return x0, y0, x1, y1

    mid = w // 2
    for name, (x0, y0, x1, y1) in (('왼쪽', box(0, mid)), ('오른쪽', box(mid, w))):
        print('  %s 쪽  left %.2f%%  top %.2f%%  width %.2f%%  height %.2f%%'
              % (name, x0 / w * 100, y0 / h * 100, (x1 - x0) / w * 100, (y1 - y0) / h * 100))


def main() -> None:
    for src, dst, measure in (
        ('book_outside.png', 'book_cover.webp', False),
        ('book_inside.png', 'book_spread.webp', True),
    ):
        path = os.path.join(UI, src)
        if not os.path.exists(path):
            print('건너뜀 (없음):', src)
            continue
        im = shrink(trim(cutout(Image.open(path))))
        out = os.path.join(UI, dst)
        im.save(out, 'WEBP', quality=90, method=6)
        print('%s → %s  %dx%d  %.0f KB'
              % (src, dst, im.width, im.height, os.path.getsize(out) / 1024))
        if measure:
            pages(im)


if __name__ == '__main__':
    main()
