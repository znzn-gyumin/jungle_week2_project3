#!/usr/bin/env python3
"""받아온 구글 로그인 버튼 그림에서 **흰 카드만** 잘라 냅니다.

    python tools/trim_login.py [받아온그림.png]

**원본 스크린샷은 저장소에 안 둡니다.** 결과물(`login_google.png`)만 있으면
되고, 구글이 버튼 디자인을 바꿨을 때 새로 받아 이 스크립트를 한 번 돌리면
됩니다.

받아오는 그림은 대개 배경이 넓고 **투명이 아니라 불투명한 #FAFAFA** 입니다.
그대로 쓰면 어두운 화면 위에 회색 판이 통째로 얹힙니다.

그림자까지 같이 자르면 어두운 배경 위에 회색 테가 남으므로, **흰 카드만**
남기고 그림자는 CSS 로 다시 겁니다 — 배경이 무엇이든 자연스럽게 얹힙니다.
"""
from __future__ import annotations
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DST = os.path.join(ROOT, 'assets', 'ui', 'login_google.png')


def main() -> None:
    src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'assets', 'ui', 'login.png')
    if not os.path.exists(src):
        raise SystemExit(
            f'받아온 그림이 없습니다: {src}\n'
            '구글 로그인 버튼 이미지를 받아 경로로 넘겨 주세요.'
        )
    im = Image.open(src).convert('RGBA')
    px = im.load()
    w, h = im.size

    # 흰 카드의 네모를 찾습니다 — 그림자(회색)는 흰색이 아니라 빠집니다
    x0, y0, x1, y1 = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            if r >= 253 and g >= 253 and b >= 253:
                x0 = min(x0, x); y0 = min(y0, y)
                x1 = max(x1, x); y1 = max(y1, y)

    card = im.crop((x0, y0, x1 + 1, y1 + 1))
    card.save(DST)
    print('원본 %dx%d → 카드 (%d,%d)-(%d,%d) = %dx%d'
          % (w, h, x0, y0, x1, y1, card.width, card.height))
    print('저장', os.path.relpath(DST, ROOT), '%.1f KB' % (os.path.getsize(DST) / 1024))


if __name__ == '__main__':
    main()
