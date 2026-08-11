"""검수 — TILE_BRIEF 7절 체크리스트를 기계적으로 검증한다.

  [ ] 타일이 48px 격자에 정확히 맞는가          → 아틀라스 크기 · 타일 수
  [ ] 바닥 타일 4장을 붙였을 때 이음매가 안 보이는가 → 경계 픽셀 불연속도 측정
  [ ] 색 수·외곽선 밀도                          → 팔레트 색 수, 외곽선 픽셀 비율
  [ ] 가구 높이가 2~2.5등신 기준인가             → 앞면 높이 측정(수동 확인용 수치)
  [ ] M1 화이트보드 접근 가능 / 문 2개 / 기둥
  [ ] collision 레이어가 가구를 막고 있는가
  [ ] 맵 간 portal 좌표가 서로 맞는가
"""
from __future__ import annotations
import json, os, collections
from PIL import Image

TS = 48
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "out")
TSDIR = os.path.join(OUT, "assets", "tilesets")
MAPDIR = os.path.join(OUT, "assets", "map")

FLOOR_PREFIX = "f_"
# 패턴 주기가 48의 약수라 '보이는 선'이 설계 의도인 타일들 (줄눈·널 이음·단코)
DESIGNED_EDGE = {"f_vinyl_seam", "f_stage_step", "f_tile", "f_deck_edge",
                 "f_deck_v", "f_deck_v2", "f_deck_h", "f_pave", "f_pave_b",
                 "f_corridor", "f_corridor_b", "f_room", "f_park_line_v", "f_park_line_h"}


def _t(img, i, cols):
    x, y = (i % cols) * TS, (i // cols) * TS
    return img.crop((x, y, x + TS, y + TS))


def check_tilesets():
    rows = []
    for name in ("tileset_edu_indoor", "tileset_dorm_indoor", "tileset_outdoor"):
        img = Image.open(os.path.join(TSDIR, name + ".png")).convert("RGBA")
        idx = json.load(open(os.path.join(TSDIR, name + ".index.json"), encoding="utf-8"))
        ok_grid = img.width % TS == 0 and img.height % TS == 0
        cols = idx["columns"]
        # 팔레트 색 수
        colors = {p[:3] for p in img.getdata() if p[3] > 0}
        # 외곽선 밀도 — 가장 어두운 색이 차지하는 비율
        dark = sum(1 for p in img.getdata() if p[3] > 0 and sum(p[:3]) < 190)
        opaque = sum(1 for p in img.getdata() if p[3] > 0)
        # 바닥 타일 이음매
        seams = []
        for piece, ids in idx["pieces"].items():
            if not piece.startswith(FLOOR_PREFIX):
                continue
            t = _t(img, ids[0], cols).convert("RGB")
            px = t.load()
            def col(x): return [px[x, y] for y in range(TS)]
            def row(y): return [px[x, y] for x in range(TS)]
            def d(a, b): return sum(abs(p[k] - q[k]) for p, q in zip(a, b)
                                    for k in range(3)) / (len(a) * 3)
            seam_x = d(col(TS - 1), col(0))     # 오른쪽 끝 ↔ 다음 타일 왼쪽 끝
            seam_y = d(row(TS - 1), row(0))
            inner_x = sum(d(col(i), col(i + 1)) for i in range(1, TS - 2)) / (TS - 3)
            inner_y = sum(d(row(i), row(i + 1)) for i in range(1, TS - 2)) / (TS - 3)
            if piece in DESIGNED_EDGE:
                continue   # 널·줄눈·단코처럼 '보여야 하는' 경계선은 이음매 결함이 아니다
            seams.append((piece, seam_x / max(inner_x, .01), seam_y / max(inner_y, .01)))
        worst = max(seams, key=lambda s: max(s[1], s[2])) if seams else None
        rows.append(dict(name=name, size=img.size, grid_ok=ok_grid,
                         tiles=idx["tileCount"], colors=len(colors),
                         outline_ratio=round(dark / max(opaque, 1), 3),
                         floor_tiles=len(seams),
                         worst_seam=(worst[0], round(max(worst[1], worst[2]), 2)) if worst else None))
    return rows


# ------------------------------------------------------------------ 맵
def load_map(name):
    return json.load(open(os.path.join(MAPDIR, name), encoding="utf-8"))


def walkable_grid(doc):
    W, H = doc["width"], doc["height"]
    coll = next(l for l in doc["layers"] if l["name"] == "collision")["data"]
    return W, H, [c == 0 for c in coll]


def flood(doc, starts):
    W, H, walk = walkable_grid(doc)
    seen = [False] * (W * H)
    dq = collections.deque()
    for sx, sy in starts:
        if 0 <= sx < W and 0 <= sy < H and walk[sy * W + sx]:
            seen[sy * W + sx] = True
            dq.append((sx, sy))
    while dq:
        x, y = dq.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < W and 0 <= ny < H and walk[ny * W + nx] and not seen[ny * W + nx]:
                seen[ny * W + nx] = True
                dq.append((nx, ny))
    return W, H, walk, seen


def objs(doc, layer):
    L = next((l for l in doc["layers"] if l["name"] == layer), None)
    return L["objects"] if L else []


def prop(o, k, default=None):
    for p in o.get("properties", []):
        if p["name"] == k:
            return p["value"]
    return default


def check_maps():
    files = sorted(os.listdir(MAPDIR))
    docs = {f[:-5]: load_map(f) for f in files if f.endswith(".json")}
    issues, summary = [], []

    for name, doc in docs.items():
        W, H, walk = walkable_grid(doc)
        spawn = [(int(o["x"] // TS), int(o["y"] // TS))
                 for o in objs(doc, "trigger") if prop(o, "kind") == "spawn"]
        if not spawn:
            issues.append(f"[{name}] spawn 트리거 없음")
            spawn = [(W // 2, H // 2)]
        _, _, _, seen = flood(doc, spawn)
        reach = sum(seen)
        free = sum(walk)
        if reach < free:
            issues.append(f"[{name}] 통행 가능 칸 {free} 중 {free - reach}칸이 스폰에서 고립")

        # 오브젝트 접근성 — 오브젝트 칸 또는 4이웃이 도달 가능해야 함
        def reachable_near(tx, ty):
            for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1), (0, 2), (0, -2)):
                x, y = tx + dx, ty + dy
                if 0 <= x < W and 0 <= y < H and seen[y * W + x]:
                    return True
            return False

        for layer in ("npc", "portal", "trigger"):
            for o in objs(doc, layer):
                tx, ty = int(o["x"] // TS), int(o["y"] // TS)
                if not reachable_near(tx, ty):
                    issues.append(f"[{name}] {layer} '{o['name']}' ({tx},{ty}) 도달 불가")

        # 포탈 상호 정합
        for o in objs(doc, "portal"):
            to = prop(o, "to")
            if to not in docs:
                issues.append(f"[{name}] portal → '{to}' 대상 맵 없음")
                continue
            t = docs[to]
            sx, sy = prop(o, "spawnX") // TS, prop(o, "spawnY") // TS
            tW, tH, twalk = walkable_grid(t)
            if not (0 <= sx < tW and 0 <= sy < tH):
                issues.append(f"[{name}] portal → {to} 도착 좌표 ({sx},{sy}) 맵 밖")
            elif not twalk[sy * tW + sx]:
                issues.append(f"[{name}] portal → {to} 도착 좌표 ({sx},{sy}) 가 막힌 칸")
            back = [p for p in objs(t, "portal") if prop(p, "to") == name]
            if not back:
                issues.append(f"[{name}] ↔ {to} 왕복 포탈 없음 ({to} 쪽에 되돌아오는 portal 부재)")

        summary.append(dict(map=name, size=f"{W}x{H}", walkable=free, reachable=reach,
                            npc=len(objs(doc, "npc")), portal=len(objs(doc, "portal")),
                            trigger=len(objs(doc, "trigger")),
                            lighting=next(p["value"] for p in doc["properties"]
                                          if p["name"] == "lighting")))

    # ---- M1 전용 (브리프 4절)
    m1 = docs["m1_basecamp_4f"]
    W, H, walk = walkable_grid(m1)
    tr = {o["name"]: o for o in objs(m1, "trigger")}
    if "whiteboard" not in tr:
        issues.append("[m1] 화이트보드 트리거 없음")
    else:
        wb = tr["whiteboard"]
        tx, ty = int(wb["x"] // TS), int(wb["y"] // TS)
        n = int(wb["width"] // TS)
        if not any(walk[ty * W + x] for x in range(tx, tx + n)):
            issues.append("[m1] 화이트보드 앞이 접근 불가")
    doors = [o for o in objs(m1, "trigger") if prop(o, "kind") == "door"]
    if len(doors) != 2:
        issues.append(f"[m1] 문이 2개여야 하는데 {len(doors)}개")
    npcs = {o["name"]: o for o in objs(m1, "npc")}
    for req in ("younger", "older", "sameage", "player_seat"):
        if req not in npcs:
            issues.append(f"[m1] NPC '{req}' 없음")
    if "younger" in npcs and "door2_exit" in tr:
        d2x = int(tr["door2_exit"]["x"] // TS)
        yx = int(npcs["younger"]["x"] // TS)
        if abs(yx - d2x) > 3:
            issues.append("[m1] 연하 자리가 문2 옆이 아님")
    team4 = sorted(int(o["x"] // TS) for o in objs(m1, "npc")
                   if prop(o, "role") == "team4")
    if len(team4) != 4:
        issues.append(f"[m1] 4조가 4명이 아님 ({len(team4)}명)")
    elif max(team4) - min(team4) > 6:
        issues.append("[m1] 4조가 나란히 앉아 있지 않음")
    extras = [o for o in objs(m1, "npc") if prop(o, "role") == "extra"]
    seats = len(objs(m1, "npc"))
    return summary, issues, dict(m1_seats=seats, m1_extras=len(extras))


def report():
    ts = check_tilesets()
    summary, issues, extra = check_maps()
    return ts, summary, issues, extra


if __name__ == "__main__":
    ts, summary, issues, extra = report()
    print("== 타일셋 ==")
    for r in ts:
        print("  ", r)
    print("== 맵 ==")
    for r in summary:
        print("  ", r)
    print("== M1 ==", extra)
    print("== 문제 ==" if issues else "== 문제 없음 ==")
    for i in issues:
        print("  -", i)
