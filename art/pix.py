"""Pixel-art isometric kit (2:1 dimetric). Low-res drawing, neon layer for glow, nearest-neighbour upscale."""
import random
from PIL import Image, ImageDraw, ImageFilter, ImageChops


def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def sh(h, f):
    r, g, b = rgb(h) if isinstance(h, str) else h[:3]
    if f <= 1:
        k = 1 - f
        return (int(r * f + 10 * k), int(g * f + 6 * k), int(b * f + 26 * k))
    k = f - 1
    return (int(r + (255 - r) * k), int(g + (255 - g) * k), int(b + (255 - b) * k))


LIT = ['#FFC857', '#FFC857', '#FF9A4A', '#7FF0E0', '#FF6B8B', '#FFE9A8']
DARKWIN = '#15131F'


class Pix:
    def __init__(self, n, seed=1, u=4, zu=8, W=260, H=330):
        self.n, self.u, self.zu = n, u, zu
        self.im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        self.neon = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)
        self.nd = ImageDraw.Draw(self.neon)
        self.ox, self.oy = W // 2, H - 90
        self.r = random.Random(seed)

    def p(self, x, y, z=0):
        return (round(self.ox + (x - y) * 2 * self.u), round(self.oy + (x + y - self.n) * self.u - z * self.zu))

    def col(self, c, a=255):
        c = rgb(c) if isinstance(c, str) else tuple(c[:3])
        return c + (a,)

    def poly(self, pts, c, neon=0):
        q = [self.p(*t) for t in pts]
        self.d.polygon(q, fill=self.col(c))
        if neon:
            self.nd.polygon(q, fill=self.col(c, neon))

    def line(self, a, b, c, neon=0, w=1):
        q = [self.p(*a), self.p(*b)]
        self.d.line(q, fill=self.col(c), width=w)
        if neon:
            self.nd.line(q, fill=self.col(c, neon), width=w)

    def dot(self, pt, c, r=1, neon=255):
        x, y = self.p(*pt)
        box = [x - r, y - r, x + r, y + r]
        self.d.ellipse(box, fill=self.col(c))
        if neon:
            self.nd.ellipse(box, fill=self.col(c, neon))

    # faces
    def rl(self, x0, x1, y, z0, z1, c, neon=0):
        self.poly([(x0, y, z1), (x1, y, z1), (x1, y, z0), (x0, y, z0)], c, neon)

    def rr(self, x, y0, y1, z0, z1, c, neon=0):
        self.poly([(x, y0, z1), (x, y1, z1), (x, y1, z0), (x, y0, z0)], c, neon)

    def rt(self, x0, y0, x1, y1, z, c, neon=0):
        self.poly([(x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z)], c, neon)

    def box(self, x, y, z, w, d, h, c, top=None, edge=True):
        self.rl(x, x + w, y + d, z, z + h, sh(c, 0.86))
        self.rr(x + w, y, y + d, z, z + h, sh(c, 0.56))
        self.rt(x, y, x + w, y + d, z + h, top or sh(c, 1.12))
        if edge:
            hl = sh(top or c, 1.35)
            self.line((x, y + d, z + h), (x + w, y + d, z + h), hl)
            self.line((x + w, y + d, z + h), (x + w, y, z + h), sh(hl, 0.8))
            self.line((x + w, y + d, z + h), (x + w, y + d, z), sh(c, 1.05))

    def wins_l(self, x0, x1, y, z0, z1, lit=0.7, px=0.5, pz=0.62, ww=0.3, wh=0.36):
        z = z0
        while z + wh <= z1 + 1e-6:
            x = x0
            while x + ww <= x1 + 1e-6:
                on = self.r.random() < lit
                c = self.r.choice(LIT) if on else DARKWIN
                self.rl(x, x + ww, y, z, z + wh, c, 70 if on else 0)
                x += px
            z += pz

    def wins_r(self, x, y0, y1, z0, z1, lit=0.6, py=0.5, pz=0.62, ww=0.3, wh=0.36):
        z = z0
        while z + wh <= z1 + 1e-6:
            y = y0
            while y + ww <= y1 + 1e-6:
                on = self.r.random() < lit
                c = sh(self.r.choice(LIT), 0.82) if on else DARKWIN
                self.rr(x, y, y + ww, z, z + wh, c, 50 if on else 0)
                y += py
            z += pz

    def tower(self, x, y, w, d, h, c, z=0, lit=0.7, base=0.5):
        self.box(x, y, z, w, d, h, c)
        self.wins_l(x + 0.22, x + w - 0.1, y + d, z + base, z + h - 0.2, lit)
        self.wins_r(x + w, y + 0.22, y + d - 0.1, z + base, z + h - 0.2, lit * 0.85)

    def roof(self, x, y, z, w, d, c, over=0.35, h=0.9):
        """Tiled hip roof with wide eaves."""
        o = over
        self.box(x - o, y - o, z, w + 2 * o, d + 2 * o, 0.14, sh(c, 0.6), edge=False)
        z2 = z + 0.14
        a, b = (x + w * 0.3, y + d / 2, z2 + h), (x + w * 0.7, y + d / 2, z2 + h)
        if w < d:
            a, b = (x + w / 2, y + d * 0.3, z2 + h), (x + w / 2, y + d * 0.7, z2 + h)
        A, B, Cc, D = (x - o, y - o, z2), (x + w + o, y - o, z2), (x + w + o, y + d + o, z2), (x - o, y + d + o, z2)
        if w >= d:
            self.poly([D, Cc, b, a], c)
            self.poly([B, Cc, b], sh(c, 0.6))
            for t in (0.33, 0.66):
                self.line((D[0] + (Cc[0] - D[0]) * t, D[1], z2), (a[0] + (b[0] - a[0]) * t, a[1], a[2]), sh(c, 0.8))
        else:
            self.poly([D, Cc, b], c)
            self.poly([B, Cc, b, a], sh(c, 0.6))
            for t in (0.33, 0.66):
                self.line((B[0], B[1] + (Cc[1] - B[1]) * t, z2), (a[0], a[1] + (b[1] - a[1]) * t, a[2]), sh(c, 0.45))
        self.line(a, b, sh(c, 1.5))
        self.line(D, Cc, sh(c, 1.4))
        self.line(Cc, B, sh(c, 0.95))

    def glyphs(self, pts, c):
        for t in pts:
            x, y = self.p(*t)
            self.d.point((x, y), fill=self.col(c))

    def sign_l(self, x0, x1, y, z0, z1, c, a=255):
        """Glowing sign on a left-facing wall."""
        self.rl(x0 - 0.05, x1 + 0.05, y, z0 - 0.06, z1 + 0.06, '#0D0B16')
        self.rl(x0, x1, y, z0, z1, c, a)
        n = max(2, int((z1 - z0) / 0.3))
        for i in range(n):
            zz = z0 + (i + 0.5) * (z1 - z0) / n
            for k in range(max(1, int((x1 - x0) / 0.22))):
                if self.r.random() < 0.6:
                    self.glyphs([(x0 + 0.1 + k * 0.2, y, zz)], sh(c, 0.3))

    def sign_r(self, x, y0, y1, z0, z1, c, a=255):
        self.rr(x, y0 - 0.05, y1 + 0.05, z0 - 0.06, z1 + 0.06, '#0D0B16')
        self.rr(x, y0, y1, z0, z1, sh(c, 0.9), a)
        n = max(2, int((z1 - z0) / 0.3))
        for i in range(n):
            zz = z0 + (i + 0.5) * (z1 - z0) / n
            for k in range(max(1, int((y1 - y0) / 0.22))):
                if self.r.random() < 0.6:
                    self.glyphs([(x, y0 + 0.1 + k * 0.2, zz)], sh(c, 0.3))

    def blade(self, x, y, z, h, c):
        """Vertical blade sign sticking out of a left-facing wall at (x, y)."""
        self.box(x, y, z, 0.12, 0.42, h, '#0D0B16', edge=False)
        self.rr(x + 0.12, y + 0.05, y + 0.37, z + 0.06, z + h - 0.06, c, 255)
        n = int(h / 0.3)
        for i in range(n):
            self.glyphs([(x + 0.12, y + 0.2, z + 0.2 + i * 0.3)], sh(c, 0.3))

    def lantern(self, x, y, z, c='#FF3B4E'):
        self.dot((x, y, z), c, 1, 255)
        px, py = self.p(x, y, z)
        self.d.point((px, py - 1), fill=self.col('#FFD9A0'))

    def lanterns_l(self, x0, x1, y, z, k=4, c='#FF3B4E'):
        self.line((x0, y, z + 0.12), (x1, y, z + 0.12), '#0D0B16')
        for i in range(k):
            self.lantern(x0 + (i + 0.5) * (x1 - x0) / k, y, z, c)

    def ac(self, x, y, z):
        self.box(x, y, z, 0.3, 0.14, 0.22, '#8C8AA0', edge=False)

    def vend(self, x, y, c='#3DF5E6'):
        self.box(x, y, 0, 0.34, 0.28, 0.62, '#D9D9E6', edge=False)
        self.rl(x + 0.04, x + 0.3, y + 0.28, 0.2, 0.56, c, 230)

    def tree(self, x, y, h=0.7):
        self.line((x, y, 0), (x, y, h), '#3A2A2A')
        for (dx, dz, r) in ((0, 0.25, 3), (-0.12, 0.0, 2), (0.14, 0.05, 2)):
            px, py = self.p(x + dx, y, h + dz)
            self.d.ellipse([px - r, py - r, px + r, py + r], fill=self.col('#1E5A4A'))
        px, py = self.p(x, y, h + 0.35)
        self.d.point((px - 1, py - 1), fill=self.col('#3FA07A'))

    def base(self, trim, top='#262335', walk='#3C3852'):
        n = self.n
        self.box(0.7, 0.7, -3.0, n - 1.4, n - 1.4, 1.0, '#17131F', edge=False)
        self.box(0.3, 0.3, -2.0, n - 0.6, n - 0.6, 1.0, '#221C2E', edge=False)
        self.box(0, 0, -1.0, n, n, 1.0, '#3A3350', top=walk, edge=False)
        self.rt(0.35, 0.35, n - 0.35, n - 0.35, 0, top)
        # neon trim: the island's identity colour
        self.line((0, n, -0.25), (n, n, -0.25), trim, 255)
        self.line((n, n, -0.25), (n, 0, -0.25), sh(trim, 0.75), 200)
        # pipes and vents on the sides
        for i in range(n):
            if self.r.random() < 0.5:
                self.rl(i + 0.3, i + 0.6, n, -0.8, -0.55, '#15131F')
            if self.r.random() < 0.4:
                self.rr(n, i + 0.3, i + 0.55, -0.85, -0.6, '#100E18')
        self.line((0.4, n - 0.3, -2.0), (n * 0.5, n - 0.3, -2.0), '#4A3F63')
        self.line((0, n, 0), (n, n, 0), sh(walk, 1.4))
        self.line((n, n, 0), (n, 0, 0), sh(walk, 1.1))

    def road_marks(self, y, x0, x1):
        x = x0
        while x < x1:
            self.rt(x, y, x + 0.35, y + 0.1, 0, '#E9E4D2')
            x += 0.7

    def crosswalk(self, x0, x1, y0, y1):
        x = x0
        while x < x1:
            self.rt(x, y0, x + 0.18, y1, 0, '#CFCAD9')
            x += 0.36

    def finish(self, path, scale=2, glow=5):
        bb = ImageChops.lighter(self.im.split()[3], self.neon.split()[3]).getbbox()
        pad = 8
        bb = (max(0, bb[0] - pad), max(0, bb[1] - pad), min(self.im.width, bb[2] + pad), min(self.im.height, bb[3] + pad))
        im = self.im.crop(bb)
        ne = self.neon.crop(bb)
        S = scale
        im = im.resize((im.width * S, im.height * S), Image.NEAREST)
        ne = ne.resize((ne.width * S, ne.height * S), Image.NEAREST)
        g1 = ne.filter(ImageFilter.GaussianBlur(glow))
        g2 = ne.filter(ImageFilter.GaussianBlur(glow * 2.6))
        halo = Image.new('RGBA', im.size, (0, 0, 0, 0))
        for g, k in ((g2, 2.2), (g1, 1.5)):
            r, gg, b, a = g.split()
            a = a.point(lambda v, k=k: int(min(255, v * k)))
            halo = Image.alpha_composite(halo, Image.merge('RGBA', (r, gg, b, a)))
        out = Image.alpha_composite(halo, im)
        r, gg, b, a = halo.split()
        a = a.point(lambda v: int(v * 0.5))
        out = Image.alpha_composite(out, Image.merge('RGBA', (r, gg, b, a)))
        out.save(path, optimize=True)
        ax = (self.ox - bb[0]) * S
        ay = (self.oy - bb[1]) * S
        return dict(w=out.width, h=out.height, ax=ax, ay=ay, n=self.n)
