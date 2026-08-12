"""Tiled 맵(.json) 빌더.

Phaser 3는 외부 타일셋 참조(source: *.tsj)를 해석하지 못하므로 맵에는 타일셋을
**임베드**한다. Tiled 에디터는 임베드된 타일셋도 그대로 열고 편집할 수 있다.
(.tsj / .png 는 별도로도 내보내므로 Tiled에서 새 맵을 만들 때 재사용 가능)

레이어
  ground     tilelayer  — 바닥
  objects    tilelayer  — 가구/벽/집기
  collision  tilelayer  — 0이 아니면 막힘 (meta 타일셋의 마커)
  npc        objectgroup
  portal     objectgroup
"""
from __future__ import annotations
import json, os, copy

TS = 48


class Tileset:
    def __init__(self, tsj: dict, index: dict, firstgid: int):
        self.tsj = tsj
        self.index = index["pieces"]
        self.solid = set(index["solid"])
        self.firstgid = firstgid

    def gid(self, piece, sub=0):
        return self.firstgid + self.index[piece][sub]

    def size(self, piece):
        return len(self.index[piece])

    def is_solid(self, piece, sub):
        return self.index[piece][sub] in self.solid


class TileMap:
    def __init__(self, name, w, h, tilesets: dict[str, Tileset], lighting: str = "day"):
        self.name, self.w, self.h = name, w, h
        self.ts = tilesets
        self.lighting = lighting
        self.ground = [0] * (w * h)
        self.objects = [0] * (w * h)
        self.collision = [0] * (w * h)
        self.npcs = []
        self.portals = []
        self.triggers = []
        self._oid = 1

    # ---------------- 저수준
    def i(self, x, y):
        return y * self.w + x

    def inb(self, x, y):
        return 0 <= x < self.w and 0 <= y < self.h

    def set_ground(self, x, y, ts, piece, sub=0):
        if self.inb(x, y):
            self.ground[self.i(x, y)] = self.ts[ts].gid(piece, sub)

    def set_obj(self, x, y, ts, piece, sub=0, solid=None):
        if not self.inb(x, y):
            return
        self.objects[self.i(x, y)] = self.ts[ts].gid(piece, sub)
        s = self.ts[ts].is_solid(piece, sub) if solid is None else solid
        # 통행 가능한 조각(문·계단·러그)을 벽 위에 덮어쓰면 충돌도 함께 지워야 한다
        self.collision[self.i(x, y)] = self.META_GID if s else 0

    def open(self, x0, y0, x1=None, y1=None):
        """충돌을 강제로 뚫는다 (출입구·통로)."""
        x1 = x0 if x1 is None else x1
        y1 = y0 if y1 is None else y1
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if self.inb(x, y):
                    self.collision[self.i(x, y)] = 0

    def block(self, x, y, on=True):
        if self.inb(x, y):
            self.collision[self.i(x, y)] = self.META_GID if on else 0

    META_GID = 0  # build 시 주입

    # ---------------- 고수준
    def fill(self, ts, piece, x=0, y=0, w=None, h=None, variants=None):
        w = self.w if w is None else w
        h = self.h if h is None else h
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                p = piece
                if variants and len(variants) > 1:
                    # 변형 타일은 드물게만 — 규칙적으로 섞으면 체커보드처럼 보인다
                    r = ((xx * 73856093) ^ (yy * 19349663)) & 0xFFFF
                    p = variants[0] if r % 100 < 76 else variants[1 + (r >> 3) % (len(variants) - 1)]
                self.set_ground(xx, yy, ts, p)

    def place(self, ts, piece, x, y, solid=None, ground=False):
        """멀티타일 조각을 (x,y)를 좌상단으로 배치. 원본 tw는 index 길이/th로 역산 못하므로
        piece 크기를 tsj 대신 PIECE_SIZE 표에서 읽는다."""
        tw, th = PIECE_SIZE[piece]
        n = 0
        for ty in range(th):
            for tx in range(tw):
                if ground:
                    self.set_ground(x + tx, y + ty, ts, piece, n)
                else:
                    self.set_obj(x + tx, y + ty, ts, piece, n, solid)
                n += 1

    # ---------------- 오브젝트 레이어
    def npc(self, name, tx, ty, **props):
        self._oid += 1
        self.npcs.append({
            "id": self._oid, "name": name, "type": "npc", "class": "npc",
            "x": tx * TS, "y": ty * TS, "width": TS, "height": TS,
            "visible": True, "rotation": 0,
            "properties": [_prop(k, v) for k, v in props.items()],
        })

    def portal(self, to, tx, ty, spawn_tx, spawn_ty, name="portal", nudge=0, **props):
        """`nudge` 는 칸을 픽셀 단위로 미는 값입니다.

        타일 0 이 맵의 왼쪽 끝이라 더 왼쪽에 둘 칸이 없을 때, 칸 자체를
        왼쪽으로 밀어 **더 깊이 들어가야** 넘어가게 만듭니다.
        """
        self._oid += 1
        p = {"to": to, "spawnX": spawn_tx * TS + TS // 2, "spawnY": spawn_ty * TS + TS // 2}
        p.update(props)
        self.portals.append({
            "id": self._oid, "name": name, "type": "portal", "class": "portal",
            "x": tx * TS + nudge, "y": ty * TS, "width": TS, "height": TS,
            "visible": True, "rotation": 0,
            "properties": [_prop(k, v) for k, v in p.items()],
        })

    def trigger(self, name, tx, ty, w=1, h=1, **props):
        self._oid += 1
        self.triggers.append({
            "id": self._oid, "name": name, "type": "trigger", "class": "trigger",
            "x": tx * TS, "y": ty * TS, "width": w * TS, "height": h * TS,
            "visible": True, "rotation": 0,
            "properties": [_prop(k, v) for k, v in props.items()],
        })

    # ---------------- 출력
    def to_json(self, tileset_defs):
        lay = lambda i, nm, data: {
            "data": data, "height": self.h, "width": self.w, "id": i,
            "name": nm, "opacity": 1, "type": "tilelayer",
            "visible": True, "x": 0, "y": 0,
        }
        grp = lambda i, nm, objs: {
            "draworder": "topdown", "id": i, "name": nm, "objects": objs,
            "opacity": 1, "type": "objectgroup", "visible": True, "x": 0, "y": 0,
        }
        layers = [
            lay(1, "ground", self.ground),
            lay(2, "objects", self.objects),
            lay(3, "collision", self.collision),
            grp(4, "npc", self.npcs),
            grp(5, "portal", self.portals),
            grp(6, "trigger", self.triggers),
        ]
        layers[2]["opacity"] = 0.0   # 게임에서는 안 보이게, Tiled에서는 켜서 확인
        return {
            "backgroundcolor": "#151318",
            "compressionlevel": -1, "height": self.h, "width": self.w,
            "infinite": False, "layers": layers,
            "nextlayerid": 7, "nextobjectid": self._oid + 1,
            "orientation": "orthogonal", "renderorder": "right-down",
            "tiledversion": "1.10.2", "tileheight": TS, "tilewidth": TS,
            "type": "map", "version": "1.10",
            "tilesets": tileset_defs,
            "properties": [
                _prop("lighting", self.lighting),
                _prop("mapName", self.name),
            ],
        }


def _prop(k, v):
    t = "bool" if isinstance(v, bool) else ("int" if isinstance(v, int) else
         ("float" if isinstance(v, float) else "string"))
    return {"name": k, "type": t, "value": v}


# piece 이름 -> (tw, th). 타일셋 모듈에서 채운다.
PIECE_SIZE: dict[str, tuple[int, int]] = {}


def register_sizes(builder):
    for p in builder.pieces:
        PIECE_SIZE[p.name] = (p.tw, p.th)
