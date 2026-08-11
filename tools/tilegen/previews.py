"""프리뷰 생성 — 맵 7장 · 조명 5종 · 이음매 4장 붙이기 검사 · 타일셋 시트."""
from __future__ import annotations
import os, json
from PIL import Image, ImageDraw
from .render import (render, apply_lighting, punch_lights, light_sources,
                     LIGHTING, PRE, MAPDIR, TSDIR, TS)

MAPS = ["m1_basecamp_4f", "m2_basecamp_2f", "m3_basecamp_1f", "m4_basecamp_b1",
        "m5_connect_garden", "m6_nestcamp", "m7_gate"]


def fit(im, maxw=1400, maxh=1600):
    s = min(maxw / im.width, maxh / im.height, 1.0)
    if s < 1.0:
        im = im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)
    return im


def save(im, path):
    """프리뷰는 JPEG로 — 확인용이라 용량을 아낀다. 실제 에셋은 assets/ 의 PNG."""
    im.convert("RGB").save(path.replace(".png", ".jpg"), quality=86, optimize=True)


def main():
    os.makedirs(PRE, exist_ok=True)
    # 1) 맵 7장 (조명 없음 = 낮 원본) + 충돌/오브젝트 오버레이 버전
    for name in MAPS:
        im, doc = render(os.path.join(MAPDIR, name + ".json"), show_objects_layer=False)
        save(fit(im), os.path.join(PRE, f"map_{name}.png"))
        im2, _ = render(os.path.join(MAPDIR, name + ".json"),
                        show_collision=True, show_objects_layer=True)
        save(fit(im2), os.path.join(PRE, f"debug_{name}.png"))

    # 2) 조명 5종 — M1(실내)과 M5(야외·여명 전용)
    for name, crop in (("m1_basecamp_4f", (96, 240, 1536, 1344)),
                       ("m5_connect_garden", (0, 240, 1536, 1392))):
        base_full, doc = render(os.path.join(MAPDIR, name + ".json"), show_objects_layer=False)
        base = base_full.crop(crop).convert("RGB")
        lights = light_sources(doc)
        tiles = []
        for key in ("day", "evening", "night", "deepnight", "dawn"):
            lit = apply_lighting(base, key)
            lit = punch_lights(base, lit, lights, key, offset=(crop[0], crop[1]))
            d = ImageDraw.Draw(lit)
            d.rectangle([0, 0, lit.width - 1, lit.height - 1], outline=(20, 18, 24), width=3)
            d.text((14, 12), key, fill=(255, 255, 255))
            tiles.append(lit)
        cols, rows = 3, 2
        w, h = tiles[0].width // 2, tiles[0].height // 2
        sheet = Image.new("RGB", (cols * w, rows * h), (16, 15, 19))
        for i, t in enumerate(tiles):
            sheet.paste(t.resize((w, h), Image.LANCZOS), ((i % cols) * w, (i // cols) * h))
        save(fit(sheet, 1400, 1700), os.path.join(PRE, f"lighting_{name}.png"))

    # 3) 이음매 검사 — 주요 바닥 타일을 4x4로 붙여 본다 (브리프 7절)
    checks = [("tileset_edu_indoor", ["f_carpet_a", "f_vinyl_a", "f_rug", "f_stage_step"]),
              ("tileset_dorm_indoor", ["f_corridor", "f_room", "f_gym", "f_tile"]),
              ("tileset_outdoor", ["f_deck_v", "f_pave", "f_grass", "f_asphalt"])]
    cells = []
    for tsname, pieces in checks:
        img = Image.open(os.path.join(TSDIR, tsname + ".png")).convert("RGBA")
        idx = json.load(open(os.path.join(TSDIR, tsname + ".index.json"), encoding="utf-8"))
        cols = idx["columns"]
        for p in pieces:
            i = idx["pieces"][p][0]
            t = img.crop(((i % cols) * TS, (i // cols) * TS,
                          (i % cols) * TS + TS, (i // cols) * TS + TS))
            blk = Image.new("RGBA", (TS * 4, TS * 4))
            for yy in range(4):
                for xx in range(4):
                    blk.paste(t, (xx * TS, yy * TS))
            cells.append((p, blk))
    cw, ch = TS * 4, TS * 4 + 22
    per = 6
    rows = (len(cells) + per - 1) // per
    sheet = Image.new("RGB", (per * cw, rows * ch), (28, 26, 32))
    d = ImageDraw.Draw(sheet)
    for i, (nm, blk) in enumerate(cells):
        x, y = (i % per) * cw, (i // per) * ch
        sheet.paste(blk.convert("RGB"), (x, y))
        d.text((x + 4, y + TS * 4 + 5), nm, fill=(220, 220, 220))
    save(sheet.resize((sheet.width * 2, sheet.height * 2), Image.NEAREST),
         os.path.join(PRE, "seam_check_4x4.png"))

    # 4) 타일셋 시트 (팔레트 확인용)
    for tsname in ("tileset_edu_indoor", "tileset_dorm_indoor", "tileset_outdoor"):
        img = Image.open(os.path.join(TSDIR, tsname + ".png")).convert("RGBA")
        bg = Image.new("RGB", img.size, (46, 44, 52))
        bg.paste(img, (0, 0), img)
        d = ImageDraw.Draw(bg)
        for x in range(0, img.width, TS):
            d.line([(x, 0), (x, img.height)], fill=(70, 68, 78))
        for y in range(0, img.height, TS):
            d.line([(0, y), (img.width, y)], fill=(70, 68, 78))
        save(bg.resize((img.width * 2, img.height * 2), Image.NEAREST),
             os.path.join(PRE, f"sheet_{tsname}.png"))
    print("previews →", PRE)


if __name__ == "__main__":
    main()
