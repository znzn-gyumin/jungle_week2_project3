"""맵 프리뷰 렌더러 + 조명 오버레이 미리보기 + 검수(7절) 자동 점검."""
from __future__ import annotations
import json, os
from PIL import Image, ImageDraw

from .paths import ROOT, OUT, TSDIR, MAPDIR, PRE

TS = 48

# 조명 오버레이 5종 (WORLD_BIBLE 8-1)
LIGHTING = {
    "day":       dict(color="#FFE6B8", blend="soft-light", opacity=0.12, sat=-0.10),
    "evening":   dict(grad=("#E8763C", "#2A3A63"), blend="overlay", opacity=0.35),
    "night":     dict(color="#153A4A", blend="multiply", opacity=0.45),
    "deepnight": dict(color="#0B1220", blend="multiply", opacity=0.72),
    # 여명은 "해 뜨기 직전"이라 심야의 어둠이 남아 있어야 한다.
    # 밝은 낮 화면에 screen 만 얹으면 따뜻한 분홍이 되어 스펙과 반대로 나온다.
    # 그래서 ① 탈채도 ② 청보라로 어둡게 를 먼저 깔고 ③ 스펙의 보라→파랑 screen 을 얹는다.
    "dawn":      dict(grad=("#5B3E8C", "#3E6BB0"), blend="screen", opacity=0.42,
                      sat=-0.60, predark=("#171326", 0.74)),
}


def _hex(s):
    s = s.lstrip("#")
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def load_sheets(doc):
    sheets = []
    for ts in doc["tilesets"]:
        img = Image.open(os.path.join(TSDIR, ts["image"])).convert("RGBA")
        sheets.append((ts["firstgid"], ts["firstgid"] + ts["tilecount"] - 1,
                       img, ts["columns"]))
    return sheets


def tile_of(sheets, gid):
    for f, l, img, cols in sheets:
        if f <= gid <= l:
            i = gid - f
            x, y = (i % cols) * TS, (i // cols) * TS
            return img.crop((x, y, x + TS, y + TS))
    return None


def render(map_path, layers=("ground", "objects"), show_collision=False,
           show_objects_layer=True):
    with open(map_path, encoding="utf-8") as f:
        doc = json.load(f)
    W, H = doc["width"], doc["height"]
    sheets = load_sheets(doc)
    im = Image.new("RGBA", (W * TS, H * TS), (21, 19, 24, 255))
    byname = {l["name"]: l for l in doc["layers"]}
    for ln in layers:
        L = byname.get(ln)
        if not L or L["type"] != "tilelayer":
            continue
        for i, gid in enumerate(L["data"]):
            if not gid:
                continue
            t = tile_of(sheets, gid)
            if t is not None:
                im.alpha_composite(t, ((i % W) * TS, (i // W) * TS))
    if show_collision:
        L = byname["collision"]
        ov = Image.new("RGBA", im.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(ov)
        for i, gid in enumerate(L["data"]):
            if gid:
                x, y = (i % W) * TS, (i // W) * TS
                d.rectangle([x, y, x + TS - 1, y + TS - 1], fill=(220, 60, 60, 70))
        im.alpha_composite(ov)
    if show_objects_layer:
        d = ImageDraw.Draw(im)
        for L in doc["layers"]:
            if L["type"] != "objectgroup":
                continue
            col = {"npc": (120, 230, 255, 255), "portal": (255, 190, 60, 255),
                   "trigger": (180, 255, 140, 255)}[L["name"]]
            for o in L["objects"]:
                d.rectangle([o["x"], o["y"], o["x"] + o["width"] - 1,
                             o["y"] + o["height"] - 1], outline=col, width=2)
    return im, doc


# ---------------------------------------------------------------- 조명
def _blend(base: Image.Image, top: Image.Image, mode: str, a: float):
    import numpy as np
    b = np.asarray(base.convert("RGB"), dtype=np.float32) / 255.0
    t = np.asarray(top.convert("RGB"), dtype=np.float32) / 255.0
    if mode == "multiply":
        r = b * t
    elif mode == "screen":
        r = 1 - (1 - b) * (1 - t)
    elif mode == "overlay":
        r = np.where(b <= 0.5, 2 * b * t, 1 - 2 * (1 - b) * (1 - t))
    elif mode == "soft-light":
        r = np.where(t <= 0.5, b - (1 - 2 * t) * b * (1 - b),
                     b + (2 * t - 1) * (np.sqrt(np.clip(b, 0, 1)) - b))
    else:
        r = t
    r = b * (1 - a) + r * a
    return Image.fromarray((np.clip(r, 0, 1) * 255).astype("uint8"), "RGB")


def light_sources(doc, tsdir=TSDIR):
    """맵에서 발광 타일 위치를 뽑는다 (타일셋 index.json 의 lights 표 사용)."""
    import os as _os
    ranges = []
    for ts in doc["tilesets"]:
        ipath = _os.path.join(tsdir, ts["name"] + ".index.json")
        if not _os.path.exists(ipath):
            continue
        idx = json.load(open(ipath, encoding="utf-8"))
        for lid, kind in idx.get("lights", {}).items():
            ranges.append((ts["firstgid"] + int(lid), kind))
    lut = dict(ranges)
    W = doc["width"]
    out = []
    for L in doc["layers"]:
        if L["type"] != "tilelayer" or L["name"] == "collision":
            continue
        for i, gid in enumerate(L["data"]):
            k = lut.get(gid)
            if k:
                out.append((k, (i % W) * TS + TS // 2, (i // W) * TS + TS // 2))
    return out


# 점광원 반경(px) · 강도 — lighting.ts 의 LIGHT_KINDS 와 같은 값
LIGHT_KINDS = {
    "monitor": (130, 0.85), "vending": (150, 0.95), "bollard": (120, 0.90),
    "lamp": (110, 0.85), "window": (170, 0.60), "ceiling": (190, 0.75),
}


def punch_lights(base: Image.Image, lit: Image.Image, lights, key, offset=(0, 0)):
    """어둠을 점광원 위치에서 걷어낸다 — 심야에 남는 건 이것뿐."""
    import numpy as np
    cfg = LIGHTING[key]
    scale = {"night": 1.0, "deepnight": 0.62}.get(key)
    if scale is None:
        return lit
    W, H = lit.size
    mask = np.zeros((H, W), dtype=np.float32)
    ys, xs = np.mgrid[0:H, 0:W]
    for kind, wx, wy in lights:
        if kind == "ceiling":
            continue                      # 실내 천장등은 밤·심야에 꺼져 있다
        r, inten = LIGHT_KINDS[kind]
        r *= scale
        cx, cy = wx - offset[0], wy - offset[1]
        if cx < -r or cy < -r or cx > W + r or cy > H + r:
            continue
        d = np.sqrt((xs - cx) ** 2 + (ys - cy) ** 2) / r
        m = np.clip(1.0 - d, 0, 1) ** 1.4 * inten
        mask = np.maximum(mask, m)
    m3 = mask[:, :, None]
    b = np.asarray(base.convert("RGB"), dtype=np.float32)
    l = np.asarray(lit.convert("RGB"), dtype=np.float32)
    out = l * (1 - m3) + b * m3
    return Image.fromarray(np.clip(out, 0, 255).astype("uint8"), "RGB")


def apply_lighting(im: Image.Image, key: str):
    import numpy as np
    cfg = LIGHTING[key]
    base = im.convert("RGB")
    if cfg.get("sat"):
        arr = np.asarray(base, dtype=np.float32)
        g = arr.mean(axis=2, keepdims=True)
        arr = g + (arr - g) * (1 + cfg["sat"])
        base = Image.fromarray(np.clip(arr, 0, 255).astype("uint8"), "RGB")
    if cfg.get("predark"):
        col, amt = cfg["predark"]
        base = _blend(base, Image.new("RGB", base.size, _hex(col)), "multiply", amt)
    if "grad" in cfg:
        c0, c1 = _hex(cfg["grad"][0]), _hex(cfg["grad"][1])
        h = base.height
        top = Image.new("RGB", base.size)
        px = top.load()
        for y in range(h):
            t = y / max(1, h - 1)
            c = tuple(int(c0[i] + (c1[i] - c0[i]) * t) for i in range(3))
            for x in range(base.width):
                px[x, y] = c
    else:
        top = Image.new("RGB", base.size, _hex(cfg["color"]))
    return _blend(base, top, cfg["blend"], cfg["opacity"])
