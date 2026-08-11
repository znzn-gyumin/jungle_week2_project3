#!/usr/bin/env python3
"""
시트 이미지를 격자로 잘라 낱장 PNG로 뽑는다.

의존 패키지가 없다. 표준 라이브러리(zlib, struct)만 쓴다.
PIL 이 안 깔리는 환경(Python 3.14 등)을 전제로 PNG 를 직접 읽고 쓴다.

예)
  # 도트 시트 → 48x48 컷 16장
  python tools/cut_sheet.py sheet_minah_sprite.png out/ \\
      --cols 4 --rows 4 --resize 48x48 \\
      --names down_idle,down_w1,down_w2,down_w3,left_idle,left_w1,left_w2,left_w3,\\
right_idle,right_w1,right_w2,right_w3,up_idle,up_w1,up_w2,up_w3

  # 표정 시트 → 얼굴 6장, 흰 배경 제거
  python tools/cut_sheet.py sheet_minah_face.png out/ \\
      --cols 3 --rows 2 --dekey ffffff --names normal,happy,shy,sad,surprise,angry

  # 여백이 있는 시트 (좌 40 상 60, 셀 사이 간격 12)
  python tools/cut_sheet.py sheet.png out/ --cols 4 --rows 4 \\
      --margin 40,60,40,60 --gutter 12
"""
import argparse, os, struct, sys, zlib

# ── PNG 읽기 ────────────────────────────────────────────────
def png_read(path):
    """8비트 PNG 를 (width, height, channels, bytearray) 로 반환."""
    d = open(path, 'rb').read()
    if d[:8] != b'\x89PNG\r\n\x1a\n':
        sys.exit(f'PNG 가 아닙니다: {path}')
    i, idat, pal, trns = 8, b'', None, None
    while i < len(d):
        ln  = struct.unpack('>I', d[i:i+4])[0]
        typ = d[i+4:i+8]
        body = d[i+8:i+8+ln]
        if   typ == b'IHDR':
            w, h, bd, ct, _, _, interlace = struct.unpack('>IIBBBBB', body)
            if bd != 8:        sys.exit(f'8비트만 지원합니다 (bitdepth={bd})')
            if interlace:      sys.exit('인터레이스 PNG 는 지원하지 않습니다')
        elif typ == b'PLTE': pal = body
        elif typ == b'tRNS': trns = body
        elif typ == b'IDAT': idat += body
        elif typ == b'IEND': break
        i += 12 + ln
    ch = {0:1, 2:3, 3:1, 4:2, 6:4}[ct]
    raw = zlib.decompress(idat)
    stride = w * ch
    out  = bytearray(stride * h)
    prev = bytearray(stride)
    pos  = 0
    for y in range(h):
        f = raw[pos]; pos += 1
        line = bytearray(raw[pos:pos+stride]); pos += stride
        if f:
            for x in range(stride):
                a = line[x-ch] if x >= ch else 0
                b = prev[x]
                c = prev[x-ch] if x >= ch else 0
                if   f == 1: line[x] = (line[x] + a) & 255
                elif f == 2: line[x] = (line[x] + b) & 255
                elif f == 3: line[x] = (line[x] + (a+b)//2) & 255
                elif f == 4:
                    p = a + b - c
                    pa, pb, pc = abs(p-a), abs(p-b), abs(p-c)
                    line[x] = (line[x] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        out[y*stride:(y+1)*stride] = line
        prev = line
    # 팔레트·그레이 → RGBA 로 통일
    rgba = bytearray(w * h * 4)
    for n in range(w*h):
        if   ct == 6: rgba[n*4:n*4+4] = out[n*4:n*4+4]
        elif ct == 2: rgba[n*4:n*4+3] = out[n*3:n*3+3]; rgba[n*4+3] = 255
        elif ct == 4: g, a = out[n*2], out[n*2+1]; rgba[n*4:n*4+4] = bytes((g,g,g,a))
        elif ct == 0: g = out[n];      rgba[n*4:n*4+4] = bytes((g,g,g,255))
        elif ct == 3:
            idx = out[n]
            rgba[n*4:n*4+3] = pal[idx*3:idx*3+3]
            rgba[n*4+3] = trns[idx] if trns and idx < len(trns) else 255
    return w, h, 4, rgba

# ── PNG 쓰기 ────────────────────────────────────────────────
def png_write(path, w, h, rgba):
    def chunk(t, b):
        return struct.pack('>I', len(b)) + t + b + struct.pack('>I', zlib.crc32(t+b) & 0xFFFFFFFF)
    raw = bytearray()
    for y in range(h):
        raw.append(0)                                  # filter: none
        raw += rgba[y*w*4:(y+1)*w*4]
    open(path, 'wb').write(
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
        + chunk(b'IDAT', zlib.compress(bytes(raw), 9))
        + chunk(b'IEND', b''))

# ── 연산 ────────────────────────────────────────────────────
def crop(w, h, rgba, x0, y0, cw, chh):
    out = bytearray(cw * chh * 4)
    for y in range(chh):
        s = ((y0+y)*w + x0) * 4
        out[y*cw*4:(y+1)*cw*4] = rgba[s:s+cw*4]
    return out

def resize_nn(w, h, rgba, nw, nh):
    """최근접 이웃. 도트를 뭉개지 않는다."""
    out = bytearray(nw * nh * 4)
    for y in range(nh):
        sy = y * h // nh
        for x in range(nw):
            sx = x * w // nw
            s, t = (sy*w + sx)*4, (y*nw + x)*4
            out[t:t+4] = rgba[s:s+4]
    return out

def dekey(w, h, rgba, key, tol):
    """배경색을 투명으로. key 는 (r,g,b)."""
    kr, kg, kb = key
    for n in range(w*h):
        o = n*4
        if abs(rgba[o]-kr) <= tol and abs(rgba[o+1]-kg) <= tol and abs(rgba[o+2]-kb) <= tol:
            rgba[o+3] = 0
    return rgba

def trim(w, h, rgba):
    """투명 여백을 잘라낸다."""
    x0, y0, x1, y1 = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            if rgba[(y*w+x)*4+3]:
                if x < x0: x0 = x
                if x > x1: x1 = x
                if y < y0: y0 = y
                if y > y1: y1 = y
    if x1 < 0: return w, h, rgba
    nw, nh = x1-x0+1, y1-y0+1
    return nw, nh, crop(w, h, rgba, x0, y0, nw, nh)

# ── 진입점 ──────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser(description='시트를 격자로 잘라 낱장 PNG 로 뽑는다')
    ap.add_argument('sheet'); ap.add_argument('outdir')
    ap.add_argument('--cols', type=int, required=True)
    ap.add_argument('--rows', type=int, required=True)
    ap.add_argument('--margin', default='0,0,0,0', help='좌,상,우,하 (px)')
    ap.add_argument('--gutter', type=int, default=0, help='셀 사이 간격 (px)')
    ap.add_argument('--resize', help='예: 48x48 — 최근접 이웃')
    ap.add_argument('--dekey',  help='예: ffffff — 이 색을 투명으로')
    ap.add_argument('--tol', type=int, default=12, help='dekey 허용 오차')
    ap.add_argument('--trim', action='store_true', help='투명 여백 제거')
    ap.add_argument('--names', help='쉼표로 구분. 좌→우, 위→아래 순')
    ap.add_argument('--prefix', default='cell')
    a = ap.parse_args()

    w, h, _, rgba = png_read(a.sheet)
    ml, mt, mr, mb = (int(v) for v in a.margin.split(','))
    gw = (w - ml - mr - a.gutter*(a.cols-1)) // a.cols
    gh = (h - mt - mb - a.gutter*(a.rows-1)) // a.rows
    if gw <= 0 or gh <= 0: sys.exit('여백·간격이 시트보다 큽니다')

    names = [n.strip() for n in a.names.split(',')] if a.names else None
    if names and len(names) != a.cols*a.rows:
        sys.exit(f'--names 개수({len(names)})가 셀 수({a.cols*a.rows})와 다릅니다')

    os.makedirs(a.outdir, exist_ok=True)
    key = tuple(int(a.dekey[i:i+2], 16) for i in (0, 2, 4)) if a.dekey else None

    print(f'시트 {w}x{h} · 셀 {gw}x{gh} · {a.cols}열 {a.rows}행')
    for r in range(a.rows):
        for c in range(a.cols):
            n  = r*a.cols + c
            cw, ch = gw, gh
            px = crop(w, h, rgba, ml + c*(gw+a.gutter), mt + r*(gh+a.gutter), cw, ch)
            if key:      px = dekey(cw, ch, px, key, a.tol)
            if a.trim:   cw, ch, px = trim(cw, ch, px)
            if a.resize:
                nw, nh = (int(v) for v in a.resize.lower().split('x'))
                px = resize_nn(cw, ch, px, nw, nh); cw, ch = nw, nh
            name = names[n] if names else f'{a.prefix}_{r}_{c}'
            out  = os.path.join(a.outdir, f'{name}.png')
            png_write(out, cw, ch, px)
            print(f'  {name}.png  {cw}x{ch}')
    print(f'{a.cols*a.rows}장 완료 → {a.outdir}')

if __name__ == '__main__':
    main()
