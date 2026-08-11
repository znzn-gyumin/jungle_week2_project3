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
        """불투명 픽셀 바깥 1px에 외곽선 색을 깐다. 4-이웃."""
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
        for x, y in add:
            self.set(x, y, c)

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


def snap_palette(im: Image.Image, palette: list) -> Image.Image:
    """제한 팔레트 강제 — 가장 가까운 팔레트 색으로 스냅. 알파는 0/255로 이진화."""
    im = im.convert("RGBA")
    px = im.load()
    cache = {}
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a < 128:
                px[x, y] = (0, 0, 0, 0); continue
            key = (r, g, b)
            if key in cache:
                px[x, y] = (*cache[key], 255); continue
            best, bd = palette[0], 1 << 30
            for pc in palette:
                d = (r - pc[0]) ** 2 * 3 + (g - pc[1]) ** 2 * 4 + (b - pc[2]) ** 2 * 2
                if d < bd: bd, best = d, pc
            cache[key] = best
            px[x, y] = (*best, 255)
    return im


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
        return snap_palette(im, self.palette)

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
