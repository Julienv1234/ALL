"""Pixel-art left menu for dashboard E: building-facade rail, roof with ALL sign, plates and icons."""
import os
import sys
import random
from PIL import Image, ImageDraw, ImageFilter

OUT = sys.argv[1] if len(sys.argv) > 1 else 'out-art'
S = 2


def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def up(im, s=S):
    return im.resize((im.width * s, im.height * s), Image.NEAREST)


def glowify(base, neon, r=4, k=1.8):
    g = neon.filter(ImageFilter.GaussianBlur(r))
    a = g.split()[3].point(lambda v: int(min(255, v * k)))
    g.putalpha(a)
    out = Image.alpha_composite(g, base)
    return out


# ---------- icons (16x16 grids) ----------
ICONS = {
    'stad': [
        "................",
        "..........#.....",
        ".........###....",
        "...##....#.#....",
        "..####...###....",
        "..#..#...#.#....",
        "..####..#####...",
        "..#..#..#.#.#...",
        "#######.#####...",
        "#.#..#..#.#.#...",
        "#######.#####...",
        "#.#..##########.",
        "#######.#.#.#.#.",
        "#.#..#..#######.",
        "################",
        "................"],
    'agenda': [
        "................",
        "...#......#.....",
        "..##########....",
        ".#############..",
        ".#...#..#...#...",
        ".############...",
        ".#..........#...",
        ".#.##.##.##.#...",
        ".#..........#...",
        ".#.##.##.##.#...",
        ".#..........#...",
        ".#.##.##....#...",
        ".#..........#...",
        ".############...",
        "................",
        "................"],
    'taken': [
        "................",
        "....######......",
        "..##......##....",
        ".#..........#...",
        ".#.........##...",
        "#.........##.#..",
        "#..##....##..#..",
        "#...##..##...#..",
        "#....####....#..",
        "#.....##.....#..",
        ".#..........#...",
        ".#..........#...",
        "..##......##....",
        "....######......",
        "................",
        "................"],
    'notities': [
        "................",
        "..#########.....",
        "..#.......##....",
        "..#.......#.#...",
        "..#.......####..",
        "..#.#####....#..",
        "..#..........#..",
        "..#.######...#..",
        "..#..........#..",
        "..#.######...#..",
        "..#..........#..",
        "..#.####.....#..",
        "..#..........#..",
        "..############..",
        "................",
        "................"],
    'agents': [
        "................",
        ".......#........",
        ".......#........",
        "....#######.....",
        "...#.......#....",
        "...#.##.##.#....",
        "...#.##.##.#....",
        "...#.......#....",
        "...#..###..#....",
        "....#######.....",
        "......###.......",
        "..###########...",
        ".#...........#..",
        ".#...........#..",
        "................",
        "................"],
    'workflows': [
        "................",
        ".........####...",
        ".........#..#...",
        ".........####...",
        "...........#....",
        ".####......#....",
        ".#..#######.....",
        ".####......#....",
        "...........#....",
        ".........####...",
        ".........#..#...",
        ".........####...",
        "................",
        "................",
        "................",
        "................"],
    'geheugen': [
        "................",
        "...#.#.#.#.#....",
        "..###########...",
        "..#.........#...",
        ".##.#######.##..",
        "..#.#.....#.#...",
        ".##.#.###.#.##..",
        "..#.#.#.#.#.#...",
        ".##.#.###.#.##..",
        "..#.#.....#.#...",
        ".##.#######.##..",
        "..#.........#...",
        "..###########...",
        "...#.#.#.#.#....",
        "................",
        "................"],
    'logboek': [
        "................",
        "....#######.....",
        "...#.......#....",
        "..#....#....#...",
        ".#.....#.....#..",
        ".#.....#.....#..",
        ".#.....#.....#..",
        ".#.....####..#..",
        ".#...........#..",
        ".#...........#..",
        "..#.........#...",
        "...#.......#....",
        "....#######.....",
        "................",
        "................",
        "................"],
}
ICONS['leren'] = [
    "................",
    "................",
    "......####......",
    "....##....##....",
    "..##........##..",
    "##............##",
    "..##........##.#",
    "....##....##...#",
    "...#..####..#..#",
    "...#........#.##",
    "...#........#.##",
    "....########....",
    "................",
    "................",
    "................",
    "................"]
ICONS['instellingen'] = [
    "................",
    ".......##.......",
    "...##..##..##...",
    "...##########...",
    "....##....##....",
    "...##......##...",
    ".###...##...###.",
    ".###..####..###.",
    "...##..##..##...",
    "....##....##....",
    "...##########...",
    "...##..##..##...",
    ".......##.......",
    "................",
    "................",
    "................"]
ICONS['meer'] = [
    "................",
    "................",
    "..####....####..",
    "..#..#....#..#..",
    "..#..#....#..#..",
    "..####....####..",
    "................",
    "................",
    "................",
    "..####....####..",
    "..#..#....#..#..",
    "..#..#....#..#..",
    "..####....####..",
    "................",
    "................",
    "................"]
ICONS['gewoontes'] = [
    "................",
    ".......#........",
    "......##........",
    "......###.......",
    ".....#.###......",
    ".....#..##..#...",
    "....#....#.##...",
    "...##.......#...",
    "...#.........#..",
    "..#....##....#..",
    "..#...#..#...#..",
    "..#...#...#..#..",
    "...#..#...#.#...",
    "....#.......#...",
    ".....#######....",
    "................"]
ICONS['websites'] = [
    "................",
    "................",
    ".##############.",
    ".#.#.#........#.",
    ".##############.",
    ".#............#.",
    ".#.#####......#.",
    ".#.#####..###.#.",
    ".#.#####......#.",
    ".#........###.#.",
    ".#............#.",
    ".#.##..##..##.#.",
    ".#.##..##..##.#.",
    ".##############.",
    "................",
    "................"]
# Same order as the menu in Rail.tsx; 'meer' (more) is only used by the phone tab bar and stays last.
ORDER = ['stad', 'agenda', 'taken', 'notities', 'leren', 'gewoontes', 'agents', 'workflows', 'websites', 'geheugen', 'logboek', 'instellingen', 'meer']


def icon(grid, col, shadow):
    im = Image.new('RGBA', (18, 18), (0, 0, 0, 0))
    for y, row in enumerate(grid):
        for x, c in enumerate(row):
            if c == '#':
                im.putpixel((x + 2, y + 2), shadow)
    for y, row in enumerate(grid):
        for x, c in enumerate(row):
            if c == '#':
                im.putpixel((x + 1, y + 1), col)
    return im


def sprite():
    """Two rows of 8 icons: normal, active. Each cell 24x24 low-res -> 48x48."""
    cell = 24
    sheet = Image.new('RGBA', (cell * len(ORDER), cell * 2), (0, 0, 0, 0))
    neon = Image.new('RGBA', sheet.size, (0, 0, 0, 0))
    for i, k in enumerate(ORDER):
        sheet.alpha_composite(icon(ICONS[k], rgb('#D9D3EA'), rgb('#241D33')), (i * cell + 3, 3))
        act = icon(ICONS[k], rgb('#FFE3E8'), rgb('#7A1830'))
        sheet.alpha_composite(act, (i * cell + 3, cell + 3))
        neon.alpha_composite(icon(ICONS[k], rgb('#FF4D6D'), (0, 0, 0, 0)), (i * cell + 3, cell + 3))
    sheet = up(sheet)
    neon = up(neon)
    out = glowify(sheet, neon, r=3, k=2.2)
    out.save(os.path.join(OUT, 'rail-icons.png'), optimize=True)


# ---------- plates ----------
def padc(im, p=4):
    out = Image.new('RGBA', (im.width + 2 * p, im.height + 2 * p), (0, 0, 0, 0))
    out.paste(im, (p, p))
    return out


def plate(active):
    w, h = 32, 28
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    neon = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    nd = ImageDraw.Draw(neon)
    # bracket hooks
    for x in (8, w - 9):
        d.rectangle([x, 0, x, 2], fill=rgb('#6E6A82'))
    if active:
        d.rectangle([1, 3, w - 2, h - 2], fill=rgb('#2A0C18'))
        d.rectangle([1, 3, w - 2, h - 2], outline=rgb('#FF4D6D'))
        d.rectangle([2, 4, w - 3, h - 3], outline=rgb('#7A1830'))
        nd.rectangle([1, 3, w - 2, h - 2], outline=rgb('#FF4D6D'))
        for x in range(4, w - 4, 3):
            d.point((x, h - 4), fill=rgb('#4A1424'))
        im, neon = padc(im), padc(neon)
        return glowify(up(im), up(neon), r=4, k=3.0)
    d.rectangle([1, 3, w - 2, h - 2], fill=rgb('#1A1526'))
    d.rectangle([1, 3, w - 2, h - 2], outline=rgb('#3E3654'))
    d.line([2, 4, w - 3, 4], fill=rgb('#4E4668'))
    d.point((3, h - 4), fill=rgb('#5A5270'))
    d.point((w - 4, h - 4), fill=rgb('#5A5270'))
    return up(padc(im))


# ---------- facade ----------
def wall_tile():
    r = random.Random(3)
    w, h = 46, 40
    im = Image.new('RGBA', (w, h), rgb('#130F1D'))
    d = ImageDraw.Draw(im)
    for y in range(0, h, 5):
        d.line([0, y, w, y], fill=rgb('#17121F'))
        off = 0 if (y // 5) % 2 == 0 else 6
        for x in range(off, w, 12):
            d.point((x, y + 1), fill=rgb('#1B1626'))
            d.line([x, y + 1, x, y + 4], fill=rgb('#100C18'))
    for _ in range(10):
        d.point((r.randrange(w), r.randrange(h)), fill=rgb('#211A2E'))
    # small dim window
    d.rectangle([3, 27, 6, 32], fill=rgb('#3A2A1E'))
    d.point((4, 28), fill=rgb('#6A4A2A'))
    # vertical cable + pipe on the right
    d.line([w - 4, 0, w - 4, h], fill=rgb('#0B0912'))
    d.line([w - 6, 0, w - 6, h], fill=rgb('#2A2338'))
    d.line([w - 7, 0, w - 7, h], fill=rgb('#1F1A2B'))
    d.rectangle([w - 8, 18, w - 5, 20], fill=rgb('#3E3654'))
    # neon edge strip
    d.line([w - 1, 0, w - 1, h], fill=rgb('#5A1428'))
    return up(im)


def roof():
    w, h = 46, 62
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    neon = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    nd = ImageDraw.Draw(neon)
    # wall behind
    d.rectangle([0, 18, w, h], fill=rgb('#130F1D'))
    # tiled roof with flared eaves
    d.polygon([(4, 10), (w - 5, 10), (w, 17), (-1, 17)], fill=rgb('#1F5566'))
    for x in range(2, w, 3):
        d.line([x, 11, x - 1, 16], fill=rgb('#17404D'))
    d.line([4, 10, w - 5, 10], fill=rgb('#3F8C9E'))
    d.line([-1, 17, w, 17], fill=rgb('#0E2A33'))
    d.line([0, 18, w, 18], fill=rgb('#0A0812'))
    d.point((0, 16), fill=rgb('#3F8C9E'))
    d.point((w - 1, 16), fill=rgb('#3F8C9E'))
    # ridge ornament
    d.rectangle([20, 7, 25, 9], fill=rgb('#17404D'))
    d.line([22, 3, 22, 6], fill=rgb('#8C8AA0'))
    d.point((22, 2), fill=rgb('#FF4D6D'))
    nd.point((22, 2), fill=rgb('#FF4D6D'))
    # hanging lanterns
    for x in (6, w - 8):
        d.line([x + 1, 18, x + 1, 21], fill=rgb('#0A0812'))
        d.rectangle([x, 22, x + 2, 26], fill=rgb('#FF3B4E'))
        d.point((x + 1, 23), fill=rgb('#FFD9A0'))
        d.line([x, 22, x + 2, 22], fill=rgb('#2A0C14'))
        nd.rectangle([x, 22, x + 2, 26], fill=rgb('#FF3B4E'))
    # ALL neon sign board
    d.rectangle([10, 30, w - 11, 44], fill=rgb('#0B0812'))
    d.rectangle([10, 30, w - 11, 44], outline=rgb('#3E3654'))
    font = {
        'A': [".##.", "#..#", "#..#", "####", "#..#", "#..#", "#..#"],
        'L': ["#...", "#...", "#...", "#...", "#...", "#...", "####"],
    }
    x0 = 13
    for ch in 'ALL':
        for yy, row in enumerate(font[ch]):
            for xx, c in enumerate(row):
                if c == '#':
                    d.point((x0 + xx, 34 + yy), fill=rgb('#FFD3DC'))
                    nd.point((x0 + xx, 34 + yy), fill=rgb('#FF4D6D'))
        x0 += 6
    d.line([10, 47, w - 11, 47], fill=rgb('#2A2338'))
    for x in (12, w - 13):
        d.line([x, 44, x, 47], fill=rgb('#2A2338'))
    im = up(im)
    return glowify(im, up(neon), r=4, k=2.4)


def footer():
    w, h = 46, 52
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    neon = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    nd = ImageDraw.Draw(neon)
    # AC unit
    d.rectangle([6, 4, 22, 14], fill=rgb('#8C8AA0'))
    d.rectangle([6, 4, 22, 14], outline=rgb('#55516A'))
    d.ellipse([8, 6, 14, 12], fill=rgb('#55516A'))
    d.line([16, 7, 20, 7], fill=rgb('#6E6A82'))
    d.line([16, 9, 20, 9], fill=rgb('#6E6A82'))
    d.line([16, 11, 20, 11], fill=rgb('#6E6A82'))
    d.line([14, 14, 14, 26], fill=rgb('#2A2338'))
    # vending machine
    d.rectangle([26, 18, 37, 46], fill=rgb('#D9D9E6'))
    d.rectangle([27, 20, 36, 32], fill=rgb('#3DF5E6'))
    nd.rectangle([27, 20, 36, 32], fill=rgb('#3DF5E6'))
    for y in (22, 25, 28):
        for x in (28, 31, 34):
            d.point((x, y), fill=rgb('#FF4D6D'))
    d.rectangle([28, 38, 35, 41], fill=rgb('#2A2338'))
    # street
    d.rectangle([0, 46, w, h], fill=rgb('#262335'))
    d.line([0, 46, w, 46], fill=rgb('#4E4668'))
    for x in range(2, w, 8):
        d.line([x, 49, x + 3, 49], fill=rgb('#3C3852'))
    # little shrub
    d.ellipse([4, 40, 10, 46], fill=rgb('#1E5A4A'))
    d.point((6, 41), fill=rgb('#3FA07A'))
    im = up(im)
    return glowify(im, up(neon), r=4, k=1.6)


if __name__ == '__main__':
    sprite()
    plate(False).save(os.path.join(OUT, 'rail-plate.png'), optimize=True)
    plate(True).save(os.path.join(OUT, 'rail-plate-on.png'), optimize=True)
    wall_tile().save(os.path.join(OUT, 'rail-wall.png'), optimize=True)
    roof().save(os.path.join(OUT, 'rail-roof.png'), optimize=True)
    footer().save(os.path.join(OUT, 'rail-foot.png'), optimize=True)
    for f in ('rail-icons', 'rail-plate', 'rail-plate-on', 'rail-wall', 'rail-roof', 'rail-foot'):
        print(f, Image.open(os.path.join(OUT, f + '.png')).size)
