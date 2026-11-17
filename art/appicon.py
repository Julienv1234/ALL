"""Pixel-art app icon for ALL: a neon 'ALL' shop sign under a little teal roof, above a night skyline.

Two hand-drawn sizes: a 64-pixel grid for the big icons (scaled 8x to 512) and a 32-pixel grid for the
favicon, so small sizes stay crisp instead of being shrunk. Everything important sits inside the
maskable safe zone (a circle of 40% radius around the centre), so Android can crop it to any shape.
Usage: python3 appicon.py <outdir>
"""
import os
import random
import sys
from PIL import Image, ImageDraw, ImageFilter

OUT = sys.argv[1] if len(sys.argv) > 1 else '.'


def rgb(h, a=255):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


FONT5 = {  # 5x7
    'A': [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
    'L': ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
}
FONT3 = {  # 3x5
    'A': [".#.", "#.#", "###", "#.#", "#.#"],
    'L': ["#..", "#..", "#..", "#..", "###"],
}


def text(d, x, y, s, font, col):
    for ch in s:
        g = font[ch]
        for yy, row in enumerate(g):
            for xx, c in enumerate(row):
                if c == '#':
                    d.point((x + xx, y + yy), fill=col)
        x += len(g[0]) + 1


def draw(n):
    """Returns (base, neon) at grid size n (64 or 32)."""
    rnd = random.Random(7)
    k = n / 64
    base = Image.new('RGBA', (n, n), rgb('#07060f'))
    neon = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    d, nd = ImageDraw.Draw(base), ImageDraw.Draw(neon)
    # sky: banded night gradient
    bands = ['#1b1430', '#171126', '#130e20', '#100c1a', '#0c0914', '#07060f']
    for i, c in enumerate(bands):
        d.rectangle([0, int(i * n / len(bands)), n, int((i + 1) * n / len(bands))], fill=rgb(c))
    for _ in range(int(14 * k * k) + 3):
        d.point((rnd.randrange(n), rnd.randrange(int(n * 0.45))), fill=rgb('#6d6290'))
    # skyline: back row then front row
    x = 0
    while x < n:
        w = rnd.randint(int(6 * k) + 2, int(11 * k) + 3)
        h = rnd.randint(int(14 * k), int(26 * k))
        d.rectangle([x, n - h, x + w - 1, n], fill=rgb('#1d1731'))
        x += w
    x = -2
    while x < n:
        w = rnd.randint(int(7 * k) + 2, int(12 * k) + 3)
        h = rnd.randint(int(8 * k), int(17 * k))
        d.rectangle([x, n - h, x + w - 1, n], fill=rgb('#211a36'))
        d.line([x, n - h, x + w - 1, n - h], fill=rgb('#3b3060'))
        if n >= 64:
            lit = rnd.choice(['#ffcf5c', '#ff4d6d', '#3df5e6'])
            for wy in range(n - h + 3, n - 1, 3):
                for wx in range(x + 2, x + w - 2, 3):
                    if rnd.random() < 0.45:
                        d.point((wx, wy), fill=rgb(lit))
                        nd.point((wx, wy), fill=rgb(lit, 110))
                    else:
                        d.point((wx, wy), fill=rgb('#2c2446'))
        x += w
    if n >= 64:
        # sign board 38x20, roof above, two posts below
        bx0, by0, bx1, by1 = 13, 21, 50, 41
        d.rectangle([bx0 - 4, by0 - 6, bx1 + 4, by0 - 4], fill=rgb('#1f6f73'))  # roof
        d.line([bx0 - 4, by0 - 6, bx1 + 4, by0 - 6], fill=rgb('#3fb4b0'))
        d.rectangle([bx0 - 2, by0 - 3, bx1 + 2, by0 - 2], fill=rgb('#2a2338'))  # beam
        d.point((bx0 - 5, by0 - 5), fill=rgb('#3fb4b0')); d.point((bx1 + 5, by0 - 5), fill=rgb('#3fb4b0'))
        d.rectangle([bx0 + 6, by1 + 1, bx0 + 7, by1 + 8], fill=rgb('#2a2338'))
        d.rectangle([bx1 - 7, by1 + 1, bx1 - 6, by1 + 8], fill=rgb('#2a2338'))
        d.rectangle([bx0, by0, bx1, by1], fill=rgb('#1c0b16'))
        for dd in (d, nd):
            dd.rectangle([bx0, by0, bx1, by1], outline=rgb('#ff4d6d'))
        # lanterns on the roof corners
        for lx in (bx0 - 3, bx1 + 3):
            d.rectangle([lx - 1, by0 - 2, lx, by0 + 1], fill=rgb('#ff4d6d'))
            nd.rectangle([lx - 1, by0 - 2, lx, by0 + 1], fill=rgb('#ff4d6d'))
        # 'ALL' at 2x, centred
        tw = (5 * 3 + 2) * 2
        tx, ty = (bx0 + bx1 + 1 - tw) // 2, by0 + 3
        big = Image.new('RGBA', (20, 8), (0, 0, 0, 0))
        text(ImageDraw.Draw(big), 0, 0, 'ALL', FONT5, rgb('#ffe3e8'))
        big = big.resize((40, 16), Image.NEAREST)
        base.alpha_composite(big, (tx, ty))
        tint = Image.new('RGBA', big.size, rgb('#ff4d6d'))
        tint.putalpha(big.split()[3])
        neon.alpha_composite(tint, (tx, ty))
    else:
        bx0, by0, bx1, by1 = 7, 10, 24, 20
        d.rectangle([bx0 - 2, by0 - 3, bx1 + 2, by0 - 2], fill=rgb('#1f6f73'))
        d.line([bx0 - 2, by0 - 3, bx1 + 2, by0 - 3], fill=rgb('#3fb4b0'))
        d.rectangle([bx0, by0, bx1, by1], fill=rgb('#1c0b16'))
        for dd in (d, nd):
            dd.rectangle([bx0, by0, bx1, by1], outline=rgb('#ff4d6d'))
        text(d, bx0 + 3, by0 + 3, 'ALL', FONT3, rgb('#ffe3e8'))
        text(nd, bx0 + 3, by0 + 3, 'ALL', FONT3, rgb('#ff4d6d'))
    return base, neon


def render(n, scale, blur):
    base, neon = draw(n)
    base = base.resize((n * scale, n * scale), Image.NEAREST)
    neon = neon.resize((n * scale, n * scale), Image.NEAREST)
    g = neon.filter(ImageFilter.GaussianBlur(blur))
    g.putalpha(g.split()[3].point(lambda v: int(min(255, v * 2.3))))
    glow = Image.alpha_composite(base, Image.new('RGBA', base.size, (0, 0, 0, 0)))
    # additive-looking glow: composite glow over the base, then put the sharp pixels back on top
    out = Image.alpha_composite(glow, g)
    sharp = base.copy()
    mask = neon.split()[3].point(lambda v: 255 if v > 200 else 0)
    out.paste(sharp, (0, 0), mask)
    return out.convert('RGB')


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    big = render(64, 8, 14)
    big.save(os.path.join(OUT, 'icon-512.png'), optimize=True)
    big.resize((192, 192), Image.LANCZOS).save(os.path.join(OUT, 'icon-192.png'), optimize=True)
    big.resize((180, 180), Image.LANCZOS).save(os.path.join(OUT, 'apple-icon.png'), optimize=True)
    small = render(32, 1, 0.8)
    small.save(os.path.join(OUT, 'favicon-32.png'), optimize=True)
    small.save(os.path.join(OUT, 'favicon.ico'), sizes=[(32, 32)])
    # preview with the maskable safe zone drawn on it
    pv = big.convert('RGBA')
    ImageDraw.Draw(pv).ellipse([256 - 205, 256 - 205, 256 + 205, 256 + 205], outline=(61, 245, 230, 255), width=2)
    sheet = Image.new('RGB', (512 + 32 * 8 + 24, 512), (40, 40, 48))
    sheet.paste(pv.convert('RGB'), (0, 0))
    sheet.paste(small.resize((256, 256), Image.NEAREST), (536, 0))
    sheet.save(os.path.join(OUT, 'icon-preview.png'))
    print('ok')
