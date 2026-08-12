"""검수 — 타일셋·타일맵 기준을 기계적으로 검증한다.

  [ ] 타일이 48px 격자에 정확히 맞는가          → 아틀라스 크기 · 타일 수
  [ ] 바닥 타일 4장을 붙였을 때 이음매가 안 보이는가 → 경계 픽셀 불연속도 측정
  [ ] 색 수·외곽선 밀도                          → 팔레트 색 수, 외곽선 픽셀 비율
  [ ] 가구 높이가 2~2.5등신 기준인가             → 앞면 높이 측정(수동 확인용 수치)
  [ ] M1 화이트보드 접근 가능 / 문 2개 / 기둥
  [ ] collision 레이어가 가구를 막고 있는가
  [ ] 맵 간 portal 좌표가 서로 맞는가
"""
from __future__ import annotations
import json, os, collections, glob, io, re
from PIL import Image

from .paths import ROOT, OUT, TSDIR, MAPDIR

TS = 48

FLOOR_PREFIX = "f_"
# 패턴 주기가 48의 약수라 '보이는 선'이 설계 의도인 타일들 (줄눈·널 이음·단코)
DESIGNED_EDGE = {"f_vinyl_seam", "f_stage_step", "f_tile", "f_deck_edge",
                 "f_deck_v", "f_deck_v2", "f_deck_h", "f_pave", "f_pave_b",
                 "f_corridor", "f_corridor_b", "f_room", "f_park_line_v", "f_park_line_h",
                 "f_pave_shade", "f_pave_shade_b", "f_soffit_top", "f_soffit_bot"}


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


def sightline(x0, y0, x1, y1):
    """두 칸을 잇는 직선이 지나는 칸들 (Bresenham). 양 끝은 뺀다."""
    pts, dx, dy = [], abs(x1 - x0), abs(y1 - y0)
    sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
    err, x, y = dx - dy, x0, y0
    while (x, y) != (x1, y1):
        e2 = err * 2
        if e2 > -dy:
            err -= dy; x += sx
        if e2 < dx:
            err += dx; y += sy
        pts.append((x, y))
    return pts[:-1]


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

    # ★ 자유 이동이 세우는 사람이 그 맵에 자리를 갖고 있는가
    #   @freeroam 의 npc 줄에는 좌표가 없다. 자리는 맵이 준다 — 없으면
    #   그 인물을 어디에 세울지 아무도 모른다.
    ROLE = {"민아": "heroine_sameage", "민규": "heroine_sameage",
            "승희": "heroine_older",   "승민": "heroine_older",
            "윤정": "heroine_younger", "윤호": "heroine_younger",
            "명진혁": "coach", "태윤": "team4_lead", "태연": "team4_lead"}
    want = collections.defaultdict(set)
    for vf in sorted(glob.glob(os.path.join(ROOT, "src", "script", "**", "*.vns"),
                               recursive=True)):
        for line in io.open(vf, encoding="utf-8"):
            mm = re.match(r"^\s*npc\s+(\S+)\s+at\s+(\S+)\s*->", line)
            if mm:
                want[mm.group(2)].add(mm.group(1))
    for mp, whos in sorted(want.items()):
        if mp not in docs:
            issues.append("[%s] .vns 가 NPC 를 세우는데 맵 파일이 없다" % mp)
            continue
        have = {prop(o, "role") for o in objs(docs[mp], "npc")}
        for who in sorted(whos):
            r = ROLE.get(who)
            if r is None:
                issues.append("[%s] '%s' 의 자리 역할을 모른다 — ROLE 표에 없다" % (mp, who))
            elif r not in have:
                issues.append("[%s] 자유 이동이 %s 를 세우는데 role=%s 자리가 없다"
                              % (mp, who, r))

    # ★ 숙소동 3F 남 / 4F 여가 계단참 하나로만 이어지는가 (WORLD_BIBLE 4-2)
    #   「남자층과 여자층이 갈리는 지점」이 계단참 하나라는 게 숙소 설정의 전부다.
    #   계단참을 막았을 때 두 복도가 끊기지 않으면 뒤로 도는 길이 있다는 뜻이다.
    m6 = docs["m6_nestcamp"]
    t6 = {o["name"]: o for o in objs(m6, "trigger")}
    need = ("stair_landing", "corridor_3f", "corridor_4f")
    if not all(k in t6 for k in need):
        issues.append("[m6] %s 중 없는 트리거가 있다"
                      % " / ".join(k for k in need if k not in t6))
    else:
        def rect(o):
            x, y = int(o["x"] // TS), int(o["y"] // TS)
            return {(x + i, y + j)
                    for i in range(max(1, int(o.get("width", TS) // TS)))
                    for j in range(max(1, int(o.get("height", TS) // TS)))}
        W6, H6, w6 = walkable_grid(m6)
        block = rect(t6["stair_landing"])
        c3 = [t for t in sorted(rect(t6["corridor_3f"])) if w6[t[1] * W6 + t[0]]]
        c4 = {t for t in rect(t6["corridor_4f"]) if w6[t[1] * W6 + t[0]]}
        if not c3 or not c4:
            issues.append("[m6] 3F/4F 복도에 통행 가능한 칸이 없다")
        else:
            seen6, dq = {c3[0]}, collections.deque([c3[0]])
            while dq:
                x, y = dq.popleft()
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    n = (x + dx, y + dy)
                    if (0 <= n[0] < W6 and 0 <= n[1] < H6 and w6[n[1] * W6 + n[0]]
                            and n not in seen6 and n not in block):
                        seen6.add(n); dq.append(n)
            leak = sorted(c4 & seen6)
            if leak:
                issues.append("[m6] 계단참을 막아도 3F 에서 4F 복도로 간다 "
                              "(%s 등 %d칸) — 층을 가르는 지점이 계단참 하나가 아니다"
                              % (leak[0], len(leak)))

    # ★ 커넥트가든을 지나지 않고 숙소동에 갈 수 있는가 (WORLD_BIBLE 4-3)
    #   「건너간다 = 오늘은 잔다」가 성립하려면 필로티 통로가 유일한 길이어야 한다.
    #   맵 하나를 빼고 포탈 그래프를 다시 이어 본다.
    edges = collections.defaultdict(set)
    for name, doc in docs.items():
        for o in objs(doc, "portal"):
            if prop(o, "to") in docs:
                edges[name].add(prop(o, "to"))
    for cut, frm, to, why in (("m5_connect_garden", "m3_basecamp_1f", "m6_nestcamp",
                               "커넥트가든을 지나지 않고도 숙소동에 갈 수 있다"),):
        seen_g, dq = {frm}, collections.deque([frm])
        while dq:
            n = dq.popleft()
            for nx in edges[n]:
                if nx != cut and nx not in seen_g:
                    seen_g.add(nx); dq.append(nx)
        if to in seen_g:
            issues.append("[map] %s — 필로티 통로를 건너지 않는 우회 경로가 있다" % why)

    # ---- M1 전용 (WORLD_BIBLE 4-2-2)
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
    # 4조 넷이 나란히 붙어 있는가
    t4 = sorted((int(o["x"] // TS), int(o["y"] // TS)) for o in objs(m1, "npc")
                if prop(o, "role") == "team4")
    if len(t4) != 4:
        issues.append(f"[m1] 4조가 4명이 아님 ({len(t4)}명)")
    else:
        xs = [p[0] for p in t4]
        if len({p[1] for p in t4}) != 1:
            issues.append("[m1] 4조가 같은 줄에 있지 않음")
        gaps = [b - a for a, b in zip(xs, xs[1:])]
        if max(gaps) > 2:
            issues.append(f"[m1] 4조가 나란히 붙어 있지 않음 (간격 {gaps})")
        # 다른 줄보다 촘촘해야 '뭉쳐 있다'가 보인다
        others = []
        for o in objs(m1, "npc"):
            if prop(o, "role") in (None, "coach") or prop(o, "role") == "team4":
                continue
            others.append((int(o["y"] // TS), int(o["x"] // TS)))
        byrow = collections.defaultdict(list)
        for ry, rx in others:
            byrow[ry].append(rx)
        wide = [min(b - a for a, b in zip(sorted(v), sorted(v)[1:]))
                for v in byrow.values() if len(v) > 1]
        if wide and max(gaps) >= min(wide):
            issues.append("[m1] 4조 간격이 다른 줄과 같아 '뭉쳐 있다'가 안 보임")

    # 동갑·연상·연하가 세 방향으로 흩어져 있는가
    seats = {o["name"]: (int(o["x"] // TS), int(o["y"] // TS)) for o in objs(m1, "npc")}
    if all(k in seats for k in ("player_seat", "younger", "older", "sameage")):
        px, py = seats["player_seat"]
        dirs = set()
        for k in ("younger", "older", "sameage"):
            sx, sy = seats[k]
            dirs.add((1 if sx > px else -1 if sx < px else 0,
                      1 if sy > py else -1 if sy < py else 0))
        if len(dirs) < 3:
            issues.append(f"[m1] 동갑·연상·연하가 세 방향으로 흩어져 있지 않음 (방향 {len(dirs)}종)")
        # 좌석 총수 = 교육장 안 NPC (코치 제외)
        room_npc = [o for o in objs(m1, "npc") if prop(o, "role") != "coach"]
        if len(room_npc) != 24:
            issues.append(f"[m1] 교육장 지정석이 24석이 아님 ({len(room_npc)}석)")

    # ---- M5 전용 ("빼면 안 되는 둘")
    m5 = docs["m5_connect_garden"]
    idx = _piece_ids("tileset_outdoor")
    gid0 = next(t["firstgid"] for t in m5["tilesets"] if t["name"] == "tileset_outdoor")
    objlayer = next(l for l in m5["layers"] if l["name"] == "objects")["data"]
    ground = next(l for l in m5["layers"] if l["name"] == "ground")["data"]

    def count(piece, data=None):
        ids = {gid0 + i for i in idx["pieces"].get(piece, [])}
        return sum(1 for g in (data if data is not None else objlayer) if g in ids)

    chair_tiles = sum(count(p) for p in idx["pieces"] if p.startswith("chair_out")) \
        + count("stool_g") + count("stool_w")
    table_tiles = count("table_out") + count("table_out_g") + count("high_table")
    if chair_tiles < 12:
        issues.append(f"[m5] 데크에 앉을 수 있는 의자가 부족 ({chair_tiles}개 · 12개 이상 필요)")
    if table_tiles < 4:
        issues.append(f"[m5] 야외 테이블이 부족 ({table_tiles})")
    if count("high_table") == 0:
        issues.append("[m5] 초록 원형 하이테이블이 없음")
    if count("piloti_round") == 0:
        issues.append("[m5] 필로티(원기둥) 열이 없음")
    shade = sum(count(p, ground) for p in ("f_pave_shade", "f_pave_shade_b"))
    if shade < 60:
        issues.append(f"[m5] 필로티 아래 통로(그늘진 포장)가 없거나 너무 좁음 ({shade}칸)")
    else:
        # 통로가 실제로 지나갈 수 있어야 한다
        W5, H5, walk5 = walkable_grid(m5)
        ids = {gid0 + i for i in idx["pieces"]["f_pave_shade"]} | \
              {gid0 + i for i in idx["pieces"]["f_pave_shade_b"]}
        rows = sorted({i // W5 for i, g in enumerate(ground) if g in ids})
        if not any(all(walk5[r * W5 + x] for x in range(6, W5 - 6)) for r in rows):
            issues.append("[m5] 필로티 통로가 가로로 뚫려 있지 않음")

    # ★ 연상 자리가 화이트보드에서 안 보이는가 (WORLD_BIBLE 4-2-2)
    #   「뒷줄 기둥 뒤 · 시선이 안 닿는 자리」가 승희의 스케치북 모티프를 받친다.
    #   책상은 낮아서 넘겨다보이므로 충돌만으로는 못 잰다. 기둥 타일이
    #   시선 위에 실제로 서 있는지를 본다.
    wb = next((o for o in objs(m1, "trigger") if o["name"] == "whiteboard"), None)
    older = next((o for o in objs(m1, "npc") if prop(o, "role") == "heroine_older"), None)
    if wb and older:
        eidx = _piece_ids("tileset_edu_indoor")
        egid = next(t["firstgid"] for t in m1["tilesets"] if t["name"] == "tileset_edu_indoor")
        pillar_ids = {egid + i for i in eidx["pieces"].get("pillar", [])}
        W = m1["width"]
        m1obj = next(l for l in m1["layers"] if l["name"] == "objects")["data"]
        wx = int((wb["x"] + wb.get("width", TS) / 2) // TS)
        wy = int((wb["y"] + wb.get("height", TS) / 2) // TS)
        ox, oy = int(older["x"] // TS), int(older["y"] // TS)
        line = sightline(wx, wy, ox, oy)
        if not any(m1obj[y * W + x] in pillar_ids for x, y in line):
            issues.append("[m1] 화이트보드 (%d,%d) 에서 연상 자리 (%d,%d) 가 그대로 보인다 "
                          "— 시선 위에 기둥이 없다" % (wx, wy, ox, oy))

    # ★ 동갑이 화이트보드에서 가장 먼가 (WORLD_BIBLE 4-2-2)
    #   「실력 1위가 맨 뒤에 앉는 게 이 배치의 핵심」이라 순서가 뒤집히면 안 된다.
    if wb:
        seat = {prop(o, "role"): (int(o["x"] // TS), int(o["y"] // TS))
                for o in objs(m1, "npc")
                if str(prop(o, "role", "")).startswith("heroine_")}
        if len(seat) == 3:
            d = {r: abs(x - wx) + abs(y - wy) for r, (x, y) in seat.items()}
            far = max(d, key=d.get)
            if far != "heroine_sameage":
                issues.append("[m1] 화이트보드에서 가장 먼 자리가 동갑이 아니라 %s 다 (%s)"
                              % (far.replace("heroine_", ""),
                                 " ".join("%s %d" % (k.replace("heroine_", ""), v)
                                          for k, v in sorted(d.items(), key=lambda x: -x[1]))))

    # ★ 문1 로 나가면 연하를 지나치지 않는가 (WORLD_BIBLE 4-2-2)
    #   「마주치기 싫으면 다른 문으로 나갈 수 있다」가 회피를 물리적으로 보장한다.
    doors = sorted((int(o["x"] // TS), int(o["y"] // TS))
                   for o in objs(m1, "trigger") if prop(o, "kind") == "door")
    player = next((o for o in objs(m1, "npc") if prop(o, "role") == "player"), None)
    younger = next((o for o in objs(m1, "npc") if prop(o, "role") == "heroine_younger"), None)
    if player and younger and len(doors) >= 1:
        W, H, walk = walkable_grid(m1)
        yx, yy = int(younger["x"] // TS), int(younger["y"] // TS)
        block = {(yx + dx, yy + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1)}
        px, py = int(player["x"] // TS), int(player["y"] // TS)
        d1 = doors[0]
        seen, dq = {(px, py)}, collections.deque([(px, py)])
        reached = False
        while dq:
            x, y = dq.popleft()
            if (x, y) == d1:
                reached = True; break
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if (0 <= nx < W and 0 <= ny < H and walk[ny * W + nx]
                        and (nx, ny) not in seen and (nx, ny) not in block):
                    seen.add((nx, ny)); dq.append((nx, ny))
        if not reached:
            issues.append("[m1] 연하 자리를 피해서는 문1 (%d,%d) 에 못 간다" % d1)

    extras = [o for o in objs(m1, "npc") if prop(o, "role") == "extra"]
    return summary, issues, dict(
        m1_room_seats=len([o for o in objs(m1, "npc") if prop(o, "role") != "coach"]),
        m1_unnamed=len(extras) + sum(1 for o in objs(m1, "npc")
                                     if prop(o, "role") == "team4" and prop(o, "named") is False),
        m5_chairs=chair_tiles, m5_tables=table_tiles,
        m5_piloti=count("piloti_round"), m5_passage_tiles=shade)


def _piece_ids(name):
    with open(os.path.join(TSDIR, name + ".index.json"), encoding="utf-8") as f:
        return json.load(f)


def check_dawn():
    """여명이 보라 → 파랑인가 (WORLD_BIBLE 8-1).
    실제 렌더 결과에서 위/아래 색상(Hue)을 재서 판정한다."""
    import colorsys
    from .render import render, apply_lighting, MAPDIR as MD
    im, _ = render(os.path.join(MD, "m5_connect_garden.json"), show_objects_layer=False)
    lit = apply_lighting(im.convert("RGB"), "dawn")
    W, H = lit.size

    def avg(y0, y1):
        px = lit.crop((0, y0, W, y1)).resize((1, 1)).getpixel((0, 0))
        h, s, v = colorsys.rgb_to_hsv(*[c / 255 for c in px])
        return px, h * 360, s

    top, htop, stop = avg(int(H * 0.05), int(H * 0.20))
    bot, hbot, sbot = avg(int(H * 0.80), int(H * 0.95))
    issues = []
    # 보라 250~300° / 파랑 200~250°
    if not (240 <= htop <= 310):
        issues.append(f"[여명] 위쪽이 보라가 아님 (hue {htop:.0f}° · rgb {top})")
    if not (195 <= hbot <= 265):
        issues.append(f"[여명] 아래쪽이 파랑이 아님 (hue {hbot:.0f}° · rgb {bot})")
    if hbot >= htop:
        issues.append(f"[여명] 위→아래가 보라→파랑 방향이 아님 ({htop:.0f}° → {hbot:.0f}°)")
    return issues, dict(top_hue=round(htop), bottom_hue=round(hbot),
                        top_rgb=top, bottom_rgb=bot)


def report():
    ts = check_tilesets()
    summary, issues, extra = check_maps()
    dawn_issues, dawn = check_dawn()
    issues = issues + dawn_issues
    extra = dict(extra, dawn=dawn)
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
