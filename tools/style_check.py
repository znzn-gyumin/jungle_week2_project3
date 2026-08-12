# -*- coding: utf-8 -*-
"""도트 인물과 타일셋의 화풍 차이를 수치로 잰다.

    python tools/style_check.py                     현행
    python tools/style_check.py assets/temp/restyle  임시 빌드와 비교

화풍은 말로 하면 서로 다른 걸 가리키게 되므로 다섯 항목으로 고정한다.
근거와 목표는 docs/reference/TILESET_RESTYLE.md 1절.
"""
import collections
import colorsys
import glob
import os
import sys

from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

DARK = 0.22   # 이 명도 미만을 '외곽선/어두운 덩어리' 로 센다


def stats(path):
    im = Image.open(path).convert('RGBA')
    px, (W, H) = im.load(), im.size
    cols = collections.Counter()
    sats, vals = [], []
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 128:
                continue
            cols[(r, g, b)] += 1
            _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            sats.append(s)
            vals.append(v)
    # 2×2 블록이 단색인 비율 — 코드로 찍은 픽셀 아트일수록 높다
    same = tot = 0
    for y in range(0, H - 1, 2):
        for x in range(0, W - 1, 2):
            q = [px[x + i, y + j] for i in (0, 1) for j in (0, 1)]
            if any(c[3] < 128 for c in q):
                continue
            tot += 1
            same += len(set(q)) == 1
    n = len(vals) or 1
    return dict(size='%dx%d' % (W, H), colors=len(cols),
                block2=100 * same / (tot or 1),
                outline=100 * sum(v < DARK for v in vals) / n,
                val=100 * sum(vals) / n, sat=100 * sum(sats) / n)


def show(title, paths):
    if not paths:
        return
    print('== %s ==' % title)
    print('  %-38s %-10s %8s %9s %9s %7s %7s'
          % ('파일', '크기', '색수', '2x2단색', '외곽선', '명도', '채도'))
    for p in paths:
        s = stats(p)
        print('  %-38s %-10s %8d %8.1f%% %8.1f%% %6.1f%% %6.1f%%'
              % (p.replace(os.sep, '/'), s['size'], s['colors'],
                 s['block2'], s['outline'], s['val'], s['sat']))
    print()


root = sys.argv[1] if len(sys.argv) > 1 else '.'
show('도트 인물 (목표 화풍)', sorted(glob.glob('assets/dot/walk/*.webp')))
show('타일셋 — %s' % root,
     [p for p in sorted(glob.glob(os.path.join(root, 'assets/tilesets/*.png')))
      if 'meta' not in p])
