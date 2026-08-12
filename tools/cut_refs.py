#!/usr/bin/env python3
"""프로필 시트 2장 -> 인물별 레퍼런스 크롭 6장.

프로필 카드에서 인물별로 잘라내는 단계입니다. 카드 정본은
docs/reference/character/README.md, 설정값 정본은 docs/CHARACTERS.md 입니다.
프로필을 다시 뽑았을 때 이 스크립트를 다시 돌리면 됩니다.

    python tools/cut_refs.py

경계는 하드코딩이 아니라 매번 검출합니다.
  - 세로: 패널 사이 흰 여백 열을 밝기로 찾습니다
  - 가로: 하단 이름표 카드의 상단 모서리를 찾습니다

의존: Pillow, numpy
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "reference" / "character"
OUT = SRC / "profiles"

# 좌 -> 우 순서. docs/CHARACTERS.md 2-0 표와 같은 순서입니다.
SHEETS = {
    "heroine_girl_profile.png": ["minah", "seunghee", "yunjung"],
    "heroine_boy_profile.png": ["mingyu", "seungmin", "yunho"],
}

INSET = 4          # 잔여 테두리 제거용 여유
BRIGHT = 235       # 이 이상이면 '여백 열'로 봅니다
MIN_GAP = 3        # 여백이 이만큼 연속돼야 패널 경계로 인정
# 카드 위로 삐져나온 색 탭(민아 카드의 청록 탭이 y=695부터 시작)까지 확실히 피합니다
CARD_MARGIN = 10


def find_panel_gaps(arr: np.ndarray) -> list[tuple[int, int]]:
    """패널 사이 흰 여백 열 구간을 (시작, 끝)으로 돌려줍니다."""
    top = arr[: int(arr.shape[0] * 0.6)]          # 이름표 카드를 피해 위쪽만 봅니다
    brightness = top.min(axis=2).mean(axis=0)

    groups: list[list[int]] = []
    for x in np.where(brightness > BRIGHT)[0]:
        if groups and x - groups[-1][-1] <= 2:
            groups[-1].append(int(x))
        else:
            groups.append([int(x)])
    return [(g[0], g[-1]) for g in groups if len(g) >= MIN_GAP]


def _longest_run(row: np.ndarray) -> int:
    """한 행에서 '색이 거의 안 변하며 이어지는' 최장 구간 길이."""
    same = np.abs(np.diff(row.astype(int), axis=0)).max(axis=1) < 5
    best = cur = 0
    for v in same:
        cur = cur + 1 if v else 0
        best = max(best, cur)
    return best


def find_card_top(panel: np.ndarray) -> int:
    """이름표 카드의 상단 y좌표. **패널 하나**를 받습니다.

    카드는 배경이 균일해서 가로로 길게 같은 색이 이어지지만, 그 위 일러스트는
    그렇지 않습니다. 위에서 아래로 내려가며 그 값이 처음 튀는 행을 찾습니다.
    (전체 이미지를 한 번에 넣으면 패널 사이 여백이 구간을 끊어 실패합니다.)
    """
    h, w = panel.shape[0], panel.shape[1]
    start = int(h * 0.55)
    runs = [_longest_run(panel[y]) for y in range(start, h)]

    need = 0.85 * w
    for i in range(len(runs) - 5):
        if all(r > need for r in runs[i : i + 6]):
            return start + i

    raise RuntimeError("이름표 카드 상단을 찾지 못했습니다 — 프로필 레이아웃이 바뀌었을 수 있습니다")


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    made = 0

    for filename, ids in SHEETS.items():
        path = SRC / filename
        if not path.exists():
            print(f"[건너뜀] {path} 없음", file=sys.stderr)
            continue

        img = Image.open(path).convert("RGB")
        arr = np.asarray(img)
        w = img.width

        gaps = find_panel_gaps(arr)
        if len(gaps) != len(ids) - 1:
            print(
                f"[실패] {filename}: 패널 경계를 {len(ids) - 1}개 찾아야 하는데 "
                f"{len(gaps)}개 찾았습니다 {gaps}",
                file=sys.stderr,
            )
            return 1

        starts = [0] + [g[1] + 1 for g in gaps]
        ends = [g[0] for g in gaps] + [w]

        print(f"{filename}: 패널 경계 {gaps}")

        for (x0, x1), cid in zip(zip(starts, ends), ids):
            left, right = x0 + INSET, x1 - INSET
            card_top = find_card_top(arr[:, left:right])
            box = (left, INSET, right, card_top - CARD_MARGIN)
            crop = img.crop(box)
            dest = OUT / f"ref_{cid}.png"
            crop.save(dest)
            print(f"  -> {dest.relative_to(ROOT)}  {crop.size}  카드상단 y={card_top}  box={box}")
            made += 1

    print(f"\n{made}장 생성")
    return 0 if made else 1


if __name__ == "__main__":
    raise SystemExit(main())
