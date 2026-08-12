# -*- coding: utf-8 -*-
"""화풍 3안을 도트 인물과 함께 나란히 놓는다.

    python tools/style_compare.py

assets/temp/restyle/{base,soft,none} 을 읽어 assets/temp/restyle/compare/ 에 쓴다.
인물을 안 얹고 판단하면 안 되므로(TILESET_RESTYLE 6절) 같은 자리에 같은 프레임을 얹는다.
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.abspath("."))
from tools.tilegen import render as R

TS = 48
ROOT = "assets/temp/restyle"
VARIANTS = [("base", "BASE  (current / hard outline)"),
            ("soft", "SOFT  (derived outline + shading)"),
            ("none", "NONE  (no outline + contact shadow)")]
DOT = "assets/dot/walk/minah.webp"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def compose(root, mapname):
    doc = json.load(open("%s/assets/map/%s.json" % (root, mapname), encoding="utf-8"))
    W, H = doc["width"], doc["height"]
    sheets = []
    for ts in doc["tilesets"]:
        img = Image.open("%s/assets/tilesets/%s" % (root, ts["image"])).convert("RGBA")
        sheets.append((ts["firstgid"], ts["firstgid"] + ts["tilecount"] - 1,
                       img, ts["columns"]))
    im = Image.new("RGBA", (W * TS, H * TS), (21, 19, 24, 255))
    byname = {l["name"]: l for l in doc["layers"]}
    for ln in ("ground", "objects"):
        L = byname.get(ln)
        if not L or L["type"] != "tilelayer":
            continue
        for i, gid in enumerate(L["data"]):
            if not gid:
                continue
            for f, l, img, cols in sheets:
                if f <= gid <= l:
                    k = gid - f
                    x, y = (k % cols) * TS, (k // cols) * TS
                    im.alpha_composite(img.crop((x, y, x + TS, y + TS)),
                                       ((i % W) * TS, (i // W) * TS))
                    break
    return im, doc


def lit(im, doc, root, key):
    out = R.apply_lighting(im, key).convert("RGBA")
    lights = R.light_sources(doc, tsdir="%s/assets/tilesets" % root)
    return R.punch_lights(im, out, lights, key).convert("RGBA")


def dot_frame(col=1, row=0):
    sh = Image.open(DOT).convert("RGBA")
    return sh.crop((col * 48, row * 64, col * 48 + 48, row * 64 + 64))


def panel(root, mapname, box, spots, light=None):
    """box=(tx,ty,tw,th) 타일 단위. spots=[(tx,ty)] 인물이 설 칸."""
    im, doc = compose(root, mapname)
    if light:
        im = lit(im, doc, root, light)
    d = dot_frame()
    for tx, ty in spots:
        im.alpha_composite(d, (tx * TS, ty * TS - 16))
    tx, ty, tw, th = box
    return im.crop((tx * TS, ty * TS, (tx + tw) * TS, (ty + th) * TS))


def strip(mapname, box, spots, light, title, path, scale=1):
    font = ImageFont.truetype(FONT, 22)
    small = ImageFont.truetype(FONT, 16)
    tiles = [panel(os.path.join(ROOT, v), mapname, box, spots, light)
             for v, _ in VARIANTS]
    if scale != 1:
        tiles = [t.resize((t.width * scale, t.height * scale), Image.NEAREST)
                 for t in tiles]
    pw, ph = tiles[0].size
    gap, top, cap = 12, 46, 30
    W = pw * 3 + gap * 4
    out = Image.new("RGB", (W, top + ph + cap + gap), (24, 24, 28))
    dr = ImageDraw.Draw(out)
    dr.text((gap, 12), title, font=font, fill=(240, 238, 232))
    for i, (t, (_, label)) in enumerate(zip(tiles, VARIANTS)):
        x = gap + i * (pw + gap)
        out.paste(t.convert("RGB"), (x, top))
        dr.text((x + 2, top + ph + 6), label, font=small, fill=(200, 198, 192))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    out.save(path, quality=92)
    print(" ", path, out.size)


def zoomstrip(path):
    """확대 필터 판단용 — 같은 조각을 NEAREST / BILINEAR 로 8배."""
    font = ImageFont.truetype(FONT, 20)
    small = ImageFont.truetype(FONT, 15)
    crop = (10 * TS + 8, 11 * TS + 20, 10 * TS + 8 + 56, 11 * TS + 20 + 42)
    cells, labels = [], []
    for v, _ in VARIANTS:
        im, _doc = compose(os.path.join(ROOT, v), "m1_basecamp_4f")
        c = im.crop(crop)
        for mode, mname in ((Image.NEAREST, "NEAREST"), (Image.BILINEAR, "LINEAR")):
            cells.append(c.resize((c.width * 8, c.height * 8), mode).convert("RGB"))
            labels.append("%s / %s" % (v.upper(), mname))
    pw, ph = cells[0].size
    gap, top, cap = 10, 42, 26
    cols = 2
    rows = 3
    W = pw * cols + gap * (cols + 1)
    Hh = top + rows * (ph + cap) + gap * rows
    out = Image.new("RGB", (W, Hh), (24, 24, 28))
    dr = ImageDraw.Draw(out)
    dr.text((gap, 10), "Zoom x8 - which filter does the new style need?",
            font=font, fill=(240, 238, 232))
    for i, (c, lb) in enumerate(zip(cells, labels)):
        r, cc = divmod(i, cols)
        x = gap + cc * (pw + gap)
        y = top + r * (ph + cap + gap)
        out.paste(c, (x, y))
        dr.text((x + 2, y + ph + 4), lb, font=small, fill=(200, 198, 192))
    out.save(path, quality=92)
    print(" ", path, out.size)


if __name__ == "__main__":
    os.makedirs(os.path.join(ROOT, "compare"), exist_ok=True)
    strip("m1_basecamp_4f", (3, 8, 15, 9), [(5, 11), (11, 13), (8, 15)], None,
          "M1 4F classroom - daylight (no overlay)",
          os.path.join(ROOT, "compare", "cmp_m1_day.jpg"))
    strip("m5_connect_garden", (5, 5, 15, 9), [(8, 8), (13, 10), (10, 12)], "deepnight",
          "M5 connect garden - deep night overlay",
          os.path.join(ROOT, "compare", "cmp_m5_deepnight.jpg"))
    strip("m1_basecamp_4f", (4, 10, 7, 5), [(6, 12), (8, 13)], None,
          "M1 desk close-up x2 (nearest)",
          os.path.join(ROOT, "compare", "cmp_m1_closeup.jpg"), scale=2)
    zoomstrip(os.path.join(ROOT, "compare", "cmp_zoom_filter.jpg"))
