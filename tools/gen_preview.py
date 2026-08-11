#!/usr/bin/env python3
"""assets/ 를 훑어 미리보기 HTML 두 장을 만든다.

    python tools/gen_preview.py

출력  docs/reference/character/preview_cg.html
      docs/reference/character/preview_dot.html

파일명이 곧 라벨이다. 어떤 그림이 어떤 파일인지 눈으로 대조하려고 만든다.
에셋 이름을 바꾸면 다시 돌린다.
"""
from __future__ import annotations
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "reference" / "character"
REL = "../../../assets"          # OUT 에서 assets 로

IDS = ["minah", "seunghee", "yunjung", "mingyu", "seungmin", "yunho"]
KR = {"minah": "김민아", "seunghee": "이승희", "yunjung": "장윤정",
      "mingyu": "김민규", "seungmin": "이승민", "yunho": "장윤호",
      "doyun": "이도윤", "doa": "이도아", "jio": "한지오", "jia": "한지아",
      "myeongjinhyeok": "명진혁", "jomin": "조민", "taeyun": "강태윤",
      "taeyeon": "강태연", "yeosanim": "여사님",
      "mob_a": "공용 A", "mob_b": "공용 B", "mob_c": "공용 C"}
EXPR = [("normal", "기본"), ("happy", "기쁨"), ("shy", "부끄러움"),
        ("sad", "슬픔"), ("surprise", "놀람"), ("angry", "화남")]
SCENE = [("garden", "① 가든"), ("climax", "② 클라이맥스"), ("ending", "③ 엔딩")]
DOT_ONLY = ["doyun", "doa", "jio", "jia", "myeongjinhyeok", "jomin",
            "taeyun", "taeyeon", "yeosanim", "mob_a", "mob_b", "mob_c"]

CSS = """
body{background:#15171c;color:#d8dbe2;font:14px/1.5 system-ui,'Malgun Gothic',sans-serif;margin:0;padding:32px}
h1{font-size:20px;margin:0 0 4px} h2{font-size:15px;margin:36px 0 12px;color:#9aa3b2;
   border-bottom:1px solid #2a2e37;padding-bottom:6px}
p.note{color:#7d8697;margin:0 0 24px}
.grid{display:grid;gap:14px}
.cell{background:#1b1e25;border:1px solid #2a2e37;border-radius:6px;padding:8px;text-align:center}
.cell img{max-width:100%;display:block;margin:0 auto 6px;background:#0e1014;border-radius:3px}
.cell code{font-size:11px;color:#8b94a5;word-break:break-all}
.cell b{display:block;font-size:12px;color:#cdd3dd;margin-bottom:4px}
.cg .grid{grid-template-columns:repeat(6,1fr)}
.still .grid{grid-template-columns:repeat(3,1fr)}
.sheet .grid{grid-template-columns:repeat(6,1fr)}
.sheet img{image-rendering:pixelated;width:192px}
.face img{image-rendering:pixelated;width:96px}
"""


def page(title: str, body: str) -> str:
    return (f"<!doctype html><meta charset='utf-8'><title>{title}</title>"
            f"<style>{CSS}</style><h1>{title}</h1>{body}")


def cell(src: str, label: str, name: str) -> str:
    return f"<div class='cell'><img src='{src}' loading='lazy'><b>{label}</b><code>{name}</code></div>"


def build_cg() -> str:
    out = ["<p class='note'>파일명이 곧 라벨입니다. 클릭하면 원본 크기로 열립니다.</p>"]
    for outfit, ok in (("casual", "평상복"), ("outing", "D7 외출복")):
        out.append(f"<section class='cg'><h2>반신 CG — {ok}</h2><div class='grid'>")
        for i in IDS:
            for e, ek in EXPR:
                n = f"{i}_{outfit}_{e}.png"
                out.append(cell(f"{REL}/cg/stand/{n}", f"{KR[i]} · {ek}", n))
        out.append("</div></section>")
    out.append("<section class='still'><h2>스틸 CG — 18장</h2><div class='grid'>")
    for s, sk in SCENE:
        for i in IDS:
            n = f"{i}_{s}.png"
            out.append(cell(f"{REL}/cg/event/{n}", f"{KR[i]} · {sk}", n))
    out.append("</div></section>")
    return "".join(out)


def build_dot() -> str:
    out = ["<p class='note'>시트는 4열 × 4행, 셀 48 × 64px. "
           "행은 아래·왼쪽·오른쪽·위, 열은 정지·걷기1·2·3입니다.</p>",
           "<section class='sheet'><h2>걷기 시트 — 18종</h2><div class='grid'>"]
    for i in IDS + DOT_ONLY:
        n = f"{i}.png"
        out.append(cell(f"{REL}/dot/walk/{n}", KR[i], n))
    out.append("</div></section>")
    out.append("<section class='sheet face'><h2>도트 감정 아바타 — 36컷 (히로인만)</h2><div class='grid'>")
    for i in IDS:
        for e, ek in EXPR:
            n = f"{i}_{e}.png"
            out.append(cell(f"{REL}/dot/face/{n}", f"{KR[i]} · {ek}", n))
    out.append("</div></section>")
    return "".join(out)


def main() -> int:
    for name, title, body in (
        ("preview_cg.html", "jungLover — CG 90장", build_cg()),
        ("preview_dot.html", "jungLover — 도트 18종 · 아바타 36컷", build_dot()),
    ):
        (OUT / name).write_text(page(title, body), encoding="utf-8")
        print("  ", OUT.relative_to(ROOT) / name)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
