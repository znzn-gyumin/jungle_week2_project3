"""jungLover 타일 생성 코어 — 48px 픽셀 드로잉 원시함수.

설계 원칙
  * 타일은 48x48, RGBA, 격자에 정확히 맞음
  * 외곽선은 어두운 색 1px — 실루엣 알파를 팽창시켜 기계적으로 보장
  * 색은 제한 팔레트 — 마지막에 팔레트로 스냅해서 색 수를 강제
  * 바닥 노이즈는 타일 로컬 좌표로만 생성 → 이웃 타일과 이음매가 생길 수 없음
"""
from __future__ import annotations
from PIL import Image
import json, os, math

from . import style as S

TS = 48  # tile size


# ---------------------------------------------------------------- 결정론 노이즈
def h32(*args) -> int:
    """작은 결정론 해시. random 모듈을 안 쓰는 이유는 재생성 시 결과가 같아야 하기 때문."""
    x = 0x9E3779B9
    for a in args:
        x ^= (int(a) + 0x165667B1 + ((x << 6) & 0xFFFFFFFF) + (x >> 2)) & 0xFFFFFFFF
        x = (x * 0x27220A95) & 0xFFFFFFFF
    x ^= x >> 15
    x = (x * 0x2C1B3C6D) & 0xFFFFFFFF
    x ^= x >> 12
    return x & 0xFFFFFFFF


def rnd(*args) -> float:
    return h32(*args) / 0xFFFFFFFF


# ---------------------------------------------------------------- 캔버스
class Canvas:
    """알파 채널을 쓰는 픽셀 캔버스. w,h는 픽셀 단위."""

    def __init__(self, w: int, h: int):
        self.w, self.h = w, h
        self.im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        self.px = self.im.load()

    # --- 기본
    def set(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h and c is not None:
            self.px[x, y] = c if len(c) == 4 else (*c, 255)

    def get(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            return self.px[x, y]
        return (0, 0, 0, 0)

    def fill(self, c):
        for y in range(self.h):
            for x in range(self.w):
                self.set(x, y, c)

    def rect(self, x0, y0, x1, y1, c):
        """[x0,x1] [y0,y1] 폐구간."""
        for y in range(max(0, y0), min(self.h, y1 + 1)):
            for x in range(max(0, x0), min(self.w, x1 + 1)):
                self.set(x, y, c)

    def frame(self, x0, y0, x1, y1, c):
        self.hline(y0, x0, x1, c); self.hline(y1, x0, x1, c)
        self.vline(x0, y0, y1, c); self.vline(x1, y0, y1, c)

    def hline(self, y, x0, x1, c):
        if x0 > x1: x0, x1 = x1, x0
        for x in range(x0, x1 + 1):
            self.set(x, y, c)

    def vline(self, x, y0, y1, c):
        if y0 > y1: y0, y1 = y1, y0
        for y in range(y0, y1 + 1):
            self.set(x, y, c)

    def line(self, x0, y0, x1, y1, c):
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx = 1 if x0 < x1 else -1
        sy = 1 if y0 < y1 else -1
        err = dx + dy
        while True:
            self.set(x0, y0, c)
            if x0 == x1 and y0 == y1: break
            e2 = 2 * err
            if e2 >= dy: err += dy; x0 += sx
            if e2 <= dx: err += dx; y0 += sy

    def ellipse(self, cx, cy, rx, ry, c):
        for y in range(int(cy - ry), int(cy + ry) + 1):
            for x in range(int(cx - rx), int(cx + rx) + 1):
                if rx <= 0 or ry <= 0: continue
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0:
                    self.set(x, y, c)

    def rrect(self, x0, y0, x1, y1, r, c):
        """모서리 깎은 사각형 — 픽셀아트에서 r=1~3 정도."""
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                dx = max(x0 + r - x, 0, x - (x1 - r))
                dy = max(y0 + r - y, 0, y - (y1 - r))
                if dx * dx + dy * dy <= r * r + 1:
                    self.set(x, y, c)

    # --- 셰이딩
    def vgrad(self, x0, y0, x1, y1, top, bot, steps=3):
        """세로 밴딩 그라데이션. 픽셀아트라 계단식으로 끊는다."""
        hgt = y1 - y0 + 1
        for i in range(steps):
            a = i / max(1, steps - 1)
            c = mix(top, bot, a)
            ya = y0 + int(hgt * i / steps)
            yb = y0 + int(hgt * (i + 1) / steps) - 1
            self.rect(x0, ya, x1, yb, c)

    def dither(self, x0, y0, x1, y1, c, density=0.5, seed=0):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if ((x + y) % 2 == 0) and rnd(x, y, seed) < density:
                    self.set(x, y, c)

    def speck(self, x0, y0, x1, y1, cols, n, seed=0):
        for i in range(n):
            x = x0 + int(rnd(seed, i, 1) * (x1 - x0 + 1))
            y = y0 + int(rnd(seed, i, 2) * (y1 - y0 + 1))
            c = cols[int(rnd(seed, i, 3) * len(cols)) % len(cols)]
            self.set(x, y, c)

    # --- 외곽선: 알파 실루엣을 1px 팽창
    def outline(self, c, only_outside=True):
        """불투명 픽셀 바깥 1px에 외곽선 색을 깐다. 4-이웃.

        화풍(JL_STYLE)에 따라 세 갈래다.
          hard  현행 그대로 — 고정 잉크색 c 를 불투명하게 두른다
          soft  이웃 평균색을 어둡게 파생 + 부분 알파 → 선이 아니라 접촉 그늘
          none  바깥 팽창을 생략하고 안쪽 그늘 + 발밑 접지 그림자로 대체
        """
        if S.OUTLINE_DROP:
            if S.INNER_RIM:
                self._inner_rim(S.INNER_RIM)
            if S.CONTACT:
                self._contact_shadow()
            return
        w, h = self.w, self.h
        src = [[self.px[x, y][3] > 0 for x in range(w)] for y in range(h)]
        add = []
        for y in range(h):
            for x in range(w):
                if src[y][x]:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and src[ny][nx]:
                        add.append((x, y)); break
        if not S.OUTLINE_DERIVE:
            for x, y in add:
                self.set(x, y, c)
            return
        for x, y in add:
            acc, n = [0, 0, 0], 0
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1),
                           (1, 1), (1, -1), (-1, 1), (-1, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and src[ny][nx]:
                    p = self.px[nx, ny]
                    acc[0] += p[0]; acc[1] += p[1]; acc[2] += p[2]; n += 1
            if not n:
                continue
            base = (acc[0] // n, acc[1] // n, acc[2] // n)
            self.px[x, y] = (*mix(base, (0, 0, 0), S.OUTLINE_DARKEN), S.OUTLINE_ALPHA)

    def _inner_rim(self, amt):
        """실루엣 '안쪽' 가장자리 1px 을 어둡게 — 선 대신 어두운 덩어리로 형태를 잡는다.

        캔버스 밖은 불투명으로 친다. 그러지 않으면 벽·바닥처럼 캔버스를 꽉 채우는
        조각의 네 변이 어두워져서 48px 마다 격자가 보인다.
        """
        w, h = self.w, self.h
        src = [[self.px[x, y][3] > 0 for x in range(w)] for y in range(h)]
        edge = []
        for y in range(h):
            for x in range(w):
                if not src[y][x]:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and not src[ny][nx]:
                        edge.append((x, y)); break
        for x, y in edge:
            p = self.px[x, y]
            self.px[x, y] = (*mix(p[:3], (0, 0, 0), amt), p[3])

    def _contact_shadow(self):
        """발밑 접지 그림자 2px — 외곽선을 지우면 오브젝트가 바닥에서 뜬다."""
        w, h = self.w, self.h
        for x in range(w):
            b = -1
            for y in range(h):
                if self.px[x, y][3] > 0:
                    b = y
            if b < 0:
                continue
            for k, a in ((1, 85), (2, 40)):
                y = b + k
                if y < h and self.px[x, y][3] == 0:
                    self.px[x, y] = (26, 22, 32, a)

    def inner_outline(self, c):
        """캔버스 경계에 붙은 오브젝트용 — 실루엣 안쪽 가장자리에 외곽선.
        (경계 밖으로 나가면 잘려버리므로 바깥 팽창이 불가능한 경우 사용)"""
        w, h = self.w, self.h
        src = [[self.px[x, y][3] > 0 for x in range(w)] for y in range(h)]
        edge = []
        for y in range(h):
            for x in range(w):
                if not src[y][x]:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if not (0 <= nx < w and 0 <= ny < h) or not src[ny][nx]:
                        edge.append((x, y)); break
        for x, y in edge:
            self.set(x, y, c)

    def paste(self, other: "Canvas", ox=0, oy=0):
        for y in range(other.h):
            for x in range(other.w):
                p = other.px[x, y]
                if p[3] > 0:
                    self.set(x + ox, y + oy, p)

    def shadow(self, x0, y0, x1, y1, c=(0, 0, 0, 60)):
        """오브젝트 발밑 접지 그림자 — 알파 블렌드."""
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if not (0 <= x < self.w and 0 <= y < self.h): continue
                b = self.px[x, y]
                if b[3] == 0:
                    self.px[x, y] = c
                else:
                    a = c[3] / 255
                    self.px[x, y] = (
                        int(b[0] * (1 - a) + c[0] * a),
                        int(b[1] * (1 - a) + c[1] * a),
                        int(b[2] * (1 - a) + c[2] * a), b[3])


# ---------------------------------------------------------------- 색 유틸
def mix(a, b, t):
    return (int(a[0] + (b[0] - a[0]) * t),
            int(a[1] + (b[1] - a[1]) * t),
            int(a[2] + (b[2] - a[2]) * t))


def shade(c, amt):
    """amt<0 어둡게, >0 밝게."""
    if amt >= 0:
        return mix(c, (255, 255, 255), amt)
    return mix(c, (0, 0, 0), -amt)


def snap_palette(im: Image.Image, palette: list, alpha_levels=()) -> Image.Image:
    """제한 팔레트 강제 — 가장 가까운 팔레트 색으로 스냅.

    alpha_levels 가 비어 있으면 알파를 0/255 로 이진화한다(현행).
    단계를 주면 그 값들로만 양자화해서 반투명 외곽선·접지 그림자를 살린다.
    """
    im = im.convert("RGBA")
    px = im.load()
    cache = {}
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if alpha_levels:
                na = min(alpha_levels, key=lambda L: abs(L - a))
                if na == 0:
                    px[x, y] = (0, 0, 0, 0); continue
            else:
                if a < 128:
                    px[x, y] = (0, 0, 0, 0); continue
                na = 255
            key = (r, g, b)
            if key in cache:
                px[x, y] = (*cache[key], na); continue
            best, bd = palette[0], 1 << 30
            for pc in palette:
                d = (r - pc[0]) ** 2 * 3 + (g - pc[1]) ** 2 * 4 + (b - pc[2]) ** 2 * 2
                if d < bd: bd, best = d, pc
            cache[key] = best
            px[x, y] = (*best, na)
    return im


def expand_palette(palette: list, steps=()) -> list:
    """팔레트에 명암 단계를 파생해 붙인다 — 계조가 스냅에서 도로 평면이 되지 않게.

    색조는 사진에서 뽑은 원본 그대로 두고 밝기 폭만 넓히므로 '없던 색' 이 생기지 않는다.
    steps 가 비면 원본을 그대로 돌려준다(현행 경로).
    """
    base = [hexc(p) if isinstance(p, str) else tuple(p) for p in palette]
    if not steps:
        return base
    out, seen = [], set()
    for c in base:
        for v in (c,) + tuple(shade(c, s) for s in steps):
            v = tuple(v)
            if v not in seen:
                seen.add(v); out.append(v)
    return out


def shade_regions(c: "Canvas", name: str = "", th: int = 1):
    """단색 덩어리마다 세로 밝기 램프를 넣는다 — 평면 채움을 2~3단 계조로.

    건드리지 않는 것
      * 이름이 f_ 로 시작하는 바닥 조각 — 이음매가 깨진다
      * 1타일 높이 조각에서 위아래로 캔버스를 관통하는 덩어리
        (벽 측면처럼 세로로 반복되는 면이라 48px 마다 띠가 생긴다)
      * 반투명 픽셀 — 부드러운 외곽선·접지 그림자·메타 타일
    """
    if name.startswith("f_"):
        return
    w, h, px = c.w, c.h, c.px
    seen = [[False] * w for _ in range(h)]
    for y0 in range(h):
        for x0 in range(w):
            if seen[y0][x0]:
                continue
            seen[y0][x0] = True
            p0 = px[x0, y0]
            if p0[3] != 255:
                continue
            stack, comp = [(x0, y0)], []
            ymin = ymax = y0
            while stack:
                x, y = stack.pop()
                comp.append((x, y))
                if y < ymin: ymin = y
                if y > ymax: ymax = y
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] \
                            and px[nx, ny] == p0:
                        seen[ny][nx] = True
                        stack.append((nx, ny))
            hgt = ymax - ymin + 1
            if len(comp) < S.SHADE_MIN_AREA or hgt < S.SHADE_MIN_H:
                continue
            if th == 1 and ymin == 0 and ymax == h - 1:
                continue
            rgb = p0[:3]
            span = S.SHADE_BOT - S.SHADE_TOP
            lut = {y: (*shade(rgb, S.SHADE_TOP + span * (y - ymin) / (hgt - 1)), 255)
                   for y in range(ymin, ymax + 1)}
            for x, y in comp:
                px[x, y] = lut[y]


def hexc(s: str):
    s = s.lstrip("#")
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))


# ---------------------------------------------------------------- 조각(piece) → 타일
class Piece:
    """멀티타일 오브젝트. 전체 캔버스에 그린 뒤 48px로 슬라이스한다.
    이렇게 해야 오브젝트를 가로지르는 외곽선이 타일 경계에서 끊기지 않는다."""

    def __init__(self, name, tw, th, fn, solid=None, layer="objects"):
        self.name = name
        self.tw, self.th = tw, th
        self.fn = fn
        # solid: 충돌로 잡을 하위 타일 인덱스 집합 (None이면 전부)
        self.solid = solid
        self.layer = layer

    def render(self) -> Canvas:
        c = Canvas(self.tw * TS, self.th * TS)
        self.fn(c)
        if S.SHADE:
            shade_regions(c, self.name, self.th)
        return c

    def slices(self):
        c = self.render()
        out = []
        for ty in range(self.th):
            for tx in range(self.tw):
                t = Canvas(TS, TS)
                for y in range(TS):
                    for x in range(TS):
                        t.set(x, y, c.get(tx * TS + x, ty * TS + y))
                out.append(t)
        return out


class TilesetBuilder:
    def __init__(self, name, palette, cols=12):
        self.name = name
        self.palette = [hexc(p) if isinstance(p, str) else p for p in palette]
        self.cols = cols
        self.pieces: list[Piece] = []
        self.index = {}    # piece name -> [local tile ids]
        self.solid = set() # local tile ids that block
        self.lights = {}   # local tile id -> 점광원 종류 (심야 조명용)
        self._tiles: list[Canvas] = []

    def add(self, name, tw, th, fn, solid=None, layer="objects", light=None,
            light_sub=None):
        """light: 'monitor'|'vending'|'bollard'|'lamp'|'window'|'ceiling'
        light_sub: 발광하는 하위 타일 인덱스 목록 (None이면 전부)"""
        p = Piece(name, tw, th, fn, solid, layer)
        p.light, p.light_sub = light, light_sub
        self.pieces.append(p)
        return self

    def build(self):
        self._tiles = []
        for p in self.pieces:
            ids = []
            sl = p.slices()
            for i, t in enumerate(sl):
                ids.append(len(self._tiles))
                self._tiles.append(t)
            self.index[p.name] = ids
            if p.solid is None:
                if p.layer == "objects":
                    self.solid.update(ids)
            else:
                for i in p.solid:
                    self.solid.add(ids[i])
            if getattr(p, "light", None):
                subs = p.light_sub if p.light_sub is not None else range(len(ids))
                for i in subs:
                    self.lights[ids[i]] = p.light
        return self

    @property
    def count(self):
        return len(self._tiles)

    def atlas(self) -> Image.Image:
        n = len(self._tiles)
        cols = self.cols
        rows = math.ceil(n / cols)
        im = Image.new("RGBA", (cols * TS, rows * TS), (0, 0, 0, 0))
        for i, t in enumerate(self._tiles):
            im.paste(t.im, ((i % cols) * TS, (i // cols) * TS))
        pal = expand_palette(self.palette)
        if not S.PALETTE_STEPS:
            return snap_palette(im, pal, S.ALPHA_LEVELS)
        # 바닥 조각(f_*)만 원본 팔레트로 스냅한다.
        # 팔레트를 넓히면 지금까지 같은 색으로 뭉개지던 바닥 변형(f_vinyl_a/b 등)이
        # 서로 다른 색으로 갈라져 48px 얼룩으로 보인다. 바닥은 이미 노이즈 텍스처라
        # 계조를 넣을 이유가 없으므로(shade_regions 도 f_ 는 건너뛴다) 현행 그대로 둔다.
        wide = expand_palette(self.palette, S.PALETTE_STEPS)
        floor = {i for name, ids in self.index.items()
                 if name.startswith("f_") for i in ids}
        out = Image.new("RGBA", (cols * TS, rows * TS), (0, 0, 0, 0))
        for i, t in enumerate(self._tiles):
            q = snap_palette(t.im.copy(), pal if i in floor else wide, S.ALPHA_LEVELS)
            out.paste(q, ((i % cols) * TS, (i // cols) * TS))
        return out

    def save(self, outdir):
        os.makedirs(outdir, exist_ok=True)
        im = self.atlas()
        png = os.path.join(outdir, f"{self.name}.png")
        im.save(png)
        n = len(self._tiles)
        cols = self.cols
        rows = math.ceil(n / cols)
        # Tiled tileset (.tsj) — 타일별 custom property 로 collides 를 넣어둔다
        tsj = {
            "columns": cols, "image": f"{self.name}.png",
            "imageheight": rows * TS, "imagewidth": cols * TS,
            "margin": 0, "name": self.name, "spacing": 0,
            "tilecount": cols * rows, "tiledversion": "1.10.2",
            "tileheight": TS, "tilewidth": TS, "type": "tileset", "version": "1.10",
            "tiles": [
                {"id": i, "properties":
                    ([{"name": "collides", "type": "bool", "value": True}] if i in self.solid else [])
                    + ([{"name": "light", "type": "string", "value": self.lights[i]}]
                       if i in self.lights else [])}
                for i in sorted(set(self.solid) | set(self.lights))
            ],
        }
        with open(os.path.join(outdir, f"{self.name}.tsj"), "w", encoding="utf-8") as f:
            json.dump(tsj, f, ensure_ascii=False, indent=1)
        # 이름 -> 타일 id 매핑도 함께 (맵 빌더와 게임 코드가 참조)
        with open(os.path.join(outdir, f"{self.name}.index.json"), "w", encoding="utf-8") as f:
            json.dump({"tileCount": n, "columns": cols,
                       "pieces": {k: v for k, v in self.index.items()},
                       "solid": sorted(self.solid),
                       "lights": {str(k): v for k, v in sorted(self.lights.items())}},
                      f, ensure_ascii=False, indent=1)
        return png
