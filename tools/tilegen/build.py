"""전체 빌드 — 타일셋 3종 + 메타 타일셋 + 타일맵 7개 + 프리뷰."""
from __future__ import annotations
import json, os, math
from PIL import Image

from .core import Canvas, TilesetBuilder, TS, hexc
from . import tiles_edu, tiles_dorm, tiles_out, palettes as P
from .map_core import TileMap, Tileset, register_sizes
from . import maps as M

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "out")
TSDIR = os.path.join(OUT, "assets", "tilesets")
MAPDIR = os.path.join(OUT, "assets", "map")
PRE = os.path.join(OUT, "preview")


# --------------------------------------------------------------- 메타 타일셋
def build_meta():
    def collide(c: Canvas):
        c.rect(0, 0, TS - 1, TS - 1, (214, 62, 62, 110))
        c.frame(0, 0, TS - 1, TS - 1, (214, 62, 62, 200))

    def trig(c: Canvas):
        c.rect(0, 0, TS - 1, TS - 1, (232, 190, 60, 90))

    b = TilesetBuilder("tileset_meta", [(214, 62, 62), (232, 190, 60), (0, 0, 0)], cols=2)
    b.add("collide", 1, 1, collide, solid=[])
    b.add("trigger", 1, 1, trig, solid=[])
    b.build()
    # 메타는 팔레트 스냅을 하면 알파가 날아가므로 직접 저장
    im = Image.new("RGBA", (2 * TS, TS), (0, 0, 0, 0))
    im.paste(b._tiles[0].im, (0, 0)); im.paste(b._tiles[1].im, (TS, 0))
    os.makedirs(TSDIR, exist_ok=True)
    im.save(os.path.join(TSDIR, "tileset_meta.png"))
    tsj = {"columns": 2, "image": "tileset_meta.png", "imageheight": TS, "imagewidth": 2 * TS,
           "margin": 0, "name": "tileset_meta", "spacing": 0, "tilecount": 2,
           "tiledversion": "1.10.2", "tileheight": TS, "tilewidth": TS,
           "type": "tileset", "version": "1.10"}
    with open(os.path.join(TSDIR, "tileset_meta.tsj"), "w", encoding="utf-8") as f:
        json.dump(tsj, f, ensure_ascii=False, indent=1)
    return tsj


def embed(tsj: dict, firstgid: int):
    d = dict(tsj); d["firstgid"] = firstgid
    return d


def main():
    os.makedirs(TSDIR, exist_ok=True); os.makedirs(MAPDIR, exist_ok=True)
    os.makedirs(PRE, exist_ok=True)

    builders = {}
    for key, mod in (("edu", tiles_edu), ("dorm", tiles_dorm), ("out", tiles_out)):
        b = mod.build(); b.save(TSDIR); register_sizes(b); builders[key] = b
        print(f"  tileset {b.name}: {b.count} tiles")
    meta_tsj = build_meta()

    def load(name):
        with open(os.path.join(TSDIR, f"{name}.tsj"), encoding="utf-8") as f:
            tsj = json.load(f)
        with open(os.path.join(TSDIR, f"{name}.index.json"), encoding="utf-8") as f:
            idx = json.load(f)
        return tsj, idx

    raw = {k: load(b.name) for k, b in builders.items()}

    report = []
    for fn in M.ALL:
        # 맵마다 firstgid 를 다시 계산 (쓰는 타일셋이 다름)
        used = {"m1": ["edu"], "m2": ["edu"], "m3": ["edu"], "m4": ["edu"],
                "m5": ["out"], "m6": ["dorm"], "m7": ["out"]}[fn.__name__]
        gid, defs, tss = 1, [], {}
        for k in used:
            tsj, idx = raw[k]
            tss[k] = Tileset(tsj, idx, gid)
            defs.append(embed(tsj, gid))
            gid += tsj["tilecount"]
        meta_gid = gid
        defs.append(embed(meta_tsj, meta_gid))

        TileMap.META_GID = meta_gid
        m = fn(tss)
        m.META_GID = meta_gid
        doc = m.to_json(defs)
        path = os.path.join(MAPDIR, f"{m.name}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
        report.append((m, defs, tss))
        print(f"  map {m.name}: {m.w}x{m.h} npc={len(m.npcs)} portal={len(m.portals)} "
              f"trigger={len(m.triggers)}")
    return report


if __name__ == "__main__":
    main()
