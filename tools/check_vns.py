# -*- coding: utf-8 -*-
"""`.vns` 를 사양과 대조하고 집필 진행률을 센다.

    python tools/check_vns.py

검사  표정 6종 · BGM 8곡 · @cg/@bg 실존 · 점프 대상 · 씬 ID 중복
진행  배치 12개 × 6인 + 공통 18씬 (docs/SCENARIO_OUTLINE.md 8-2)

아직 안 쓴 씬으로 가는 점프는 오류가 아니라 `미작성`으로 셉니다.
가로 작업에서는 다음 배치를 쓰기 전까지 항상 그 상태입니다.
"""
import glob, os, re, io, sys, collections
sys.stdout.reconfigure(encoding='utf-8')

EXPR = {'기본', '기쁨', '부끄러움', '슬픔', '놀람', '화남'}
BGM = {'title', 'day', 'session', 'night', 'midnight', 'tension', 'swell', 'epilogue'}
ROUTES = ['minah', 'seunghee', 'yunjung', 'mingyu', 'seungmin', 'yunho']
BATCH = ['c1_pair', 'c1_review', 'c2_talk', 'c2_allnighter', 'c2_garden',
         'c3_folkvillage', 'c3_everland', 'c3_collegetown',
         'c4_talk', 'c4_classroom', 'c4_lastnight',
         'end_true', 'end_good', 'end_normal']
COMMON = ['p_arrival', 'p_orientation', 'p_friend', 'p_freeroam', 'p_night',
          'p_meet_minah', 'p_meet_seunghee', 'p_meet_yunjung',
          'p_meet_mingyu', 'p_meet_seungmin', 'p_meet_yunho',
          'c2_ranking', 'c2_freeroam', 'c3_outing', 'c3_bus', 'c4_freeroam',
          'e_ceremony', 'e_solo']
PLANNED = {'r_%s_%s' % (r, b) for r in ROUTES for b in BATCH} | set(COMMON)

CG = {os.path.splitext(os.path.basename(f))[0] for f in glob.glob('assets/cg/event/*.png')}
BG = {os.path.splitext(os.path.basename(f))[0]
      for f in glob.glob('assets/bg/*/*.png') + glob.glob('assets/bg/campus/*/*.png')}

files = sorted(glob.glob('src/script/**/*.vns', recursive=True))
scenes, labels, jumps, bad = {}, collections.defaultdict(set), [], []
counts, pending = {}, set()

for f in files:
    cur, dlg = None, 0
    for n, line in enumerate(io.open(f, encoding='utf-8'), 1):
        s = line.strip()
        if not s or s.startswith('//'):
            continue
        loc = '%s:%d' % (f.replace(os.sep, '/'), n)
        m = re.match(r'^===\s*(\S+)\s*===$', s)
        if m:
            cur = m.group(1)
            if cur in scenes:
                bad.append('%s  씬 ID 중복 %s' % (loc, cur))
            scenes[cur] = f
            continue
        m = re.match(r'^---\s*(\S+)\s*---$', s)
        if m:
            labels[cur].add(m.group(1)); continue
        m = re.search(r'->\s*(\S+)\s*$', s)
        if m:
            jumps.append((loc, cur, m.group(1)))
        m = re.match(r'^@bgm\s+(\S+)', s)
        if m and m.group(1) not in BGM:
            bad.append('%s  BGM 없음 %s' % (loc, m.group(1)))
        m = re.match(r'^@cg\s+(\S+)', s)
        if m and m.group(1) not in CG:
            bad.append('%s  스틸 CG 없음 %s' % (loc, m.group(1)))
        m = re.match(r'^@bg\s+(\S+)', s)
        if m and m.group(1) not in BG:
            bad.append('%s  배경 없음 %s' % (loc, m.group(1)))
        m = re.match(r'^(\S+)\s*\[([^\]]+)\]', s)
        if m and m.group(2) not in EXPR:
            bad.append('%s  표정 없음 [%s]' % (loc, m.group(2)))
        if s.startswith('*') or re.match(r'^\S+\s*(\[[^\]]+\])?\s*"', s):
            dlg += 1
    counts[f] = dlg

for loc, cur, tgt in jumps:
    if tgt in ('back', 'next_chapter') or tgt.startswith('r_*_'):
        continue
    if tgt in scenes or tgt in labels.get(cur, ()):
        continue
    if tgt in PLANNED:
        pending.add(tgt); continue
    bad.append('%s  점프 대상 없음 -> %s  (씬 %s)' % (loc, tgt, cur))

print('씬 %d개 · 파일 %d개 · %d줄' % (len(scenes), len(files), sum(counts.values())))
for f in files:
    print('  %-42s %4d줄' % (f.replace(os.sep, '/'), counts[f]))

print()
print('진행 — 루트 씬 14종 × 6인 (배치 12 + 자유 이동 대화 2)')
print('  %-16s %s' % ('배치', '  '.join('%-8s' % r for r in ROUTES)))
done_r = 0
for b in BATCH:
    cells = ['r_%s_%s' % (r, b) in scenes for r in ROUTES]
    done_r += sum(cells)
    print('  %-16s %s' % (b, '  '.join('%-8s' % ('O' if c else '.') for c in cells)))
done_c = sum(1 for c in COMMON if c in scenes)
print()
print('  루트 %d/%d · 공통 %d/18 · 합계 %d씬' % (done_r, len(BATCH)*6, done_c, done_r + done_c))

print()
if bad:
    print('문제 %d건' % len(bad))
    for b in bad:
        print('  X', b)
else:
    print('표정 · BGM · CG · 배경 · 점프 대상 — 전부 통과')
if pending:
    print('미작성 씬으로 가는 점프 %d건 — 다음 배치에서 채워집니다' % len(pending))
