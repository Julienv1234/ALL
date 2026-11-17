"""Original pixel-art neon city-block islands + skyline backdrop for dashboard E."""
import json
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pix import Pix, sh, rgb  # noqa: E402
from PIL import Image, ImageDraw, ImageFilter  # noqa: E402

OUT = sys.argv[1] if len(sys.argv) > 1 else 'out-art'
RED, CYAN, GREEN, YEL, MAG, BLUE, PURP, ORA = '#FF3B5C', '#3DF5E6', '#6CFF8A', '#FFE14D', '#FF5AD1', '#4AA8FF', '#B66BFF', '#FF9A4A'
W_PUR, W_NAVY, W_MAR, W_TEAL, W_BRN, W_CON = '#3A3350', '#343A5C', '#4A3440', '#3D4A4A', '#5A4A3E', '#54506A'
R_TEAL, R_NAVY, R_RED = '#1F5566', '#27314F', '#5A2A3A'


def shop(I, x, y, w, d, h, wall, glass, sign=None, lant=True, roofc=None):
    I.box(x, y, 0, w, d, h, wall)
    I.rl(x + 0.2, x + w - 0.2, y + d, 0.12, h * 0.62, glass, 110)
    I.rl(x + w * 0.42, x + w * 0.58, y + d, 0.12, h * 0.62, sh(glass, 0.55))
    I.rr(x + w, y + 0.25, y + d - 0.25, 0.3, h * 0.6, sh(glass, 0.7), 60)
    if sign:
        I.sign_l(x + 0.15, x + w - 0.15, y + d, h * 0.7, h * 0.92, sign)
    if lant:
        I.lanterns_l(x + 0.2, x + w - 0.2, y + d + 0.12, h * 0.66, max(2, int(w * 1.4)))
    if roofc:
        I.roof(x, y, h, w, d, roofc, over=0.3, h=0.55)


def rooftop(I, x, y, z, w, d):
    I.box(x + 0.25, y + 0.3, z, 0.5, 0.5, 0.45, '#6E6A82', edge=False)
    I.ac(x + w - 0.6, y + d - 0.5, z)
    I.line((x + w - 0.3, y + 0.3, z), (x + w - 0.3, y + 0.3, z + 1.1), '#8C8AA0')
    I.dot((x + w - 0.3, y + 0.3, z + 1.15), RED, 0, 255)


def hub():
    I = Pix(8, seed=11)
    I.base(RED)
    I.crosswalk(2.6, 5.4, 6.7, 7.6)
    I.road_marks(7.75, 0.5, 2.4)
    I.road_marks(7.75, 5.6, 7.6)
    # back row
    I.tower(0.7, 0.8, 2.0, 2.4, 3.2, W_MAR)
    I.roof(0.7, 0.8, 3.2, 2.0, 2.4, R_TEAL, h=0.8)
    I.blade(1.4, 3.2, 1.3, 1.5, GREEN)
    I.tower(3.0, 0.9, 2.6, 2.6, 7.6, W_NAVY, lit=0.8)
    I.sign_l(3.3, 5.3, 3.5, 5.3, 7.1, CYAN)
    I.sign_r(5.6, 1.3, 3.1, 4.0, 7.1, RED)
    I.box(3.5, 1.4, 7.6, 1.2, 1.2, 0.5, '#4A4F74')
    I.line((4.1, 2.0, 8.1), (4.1, 2.0, 10.0), '#B9B7CC')
    I.line((3.8, 2.0, 9.2), (4.4, 2.0, 9.2), '#B9B7CC')
    I.dot((4.1, 2.0, 10.05), RED, 1, 255)
    I.ac(5.0, 2.9, 7.6)
    I.tower(6.0, 1.2, 1.4, 2.2, 2.6, W_TEAL)
    rooftop(I, 6.0, 1.2, 2.6, 1.4, 2.2)
    I.blade(6.5, 3.4, 0.9, 1.4, MAG)
    # front row
    shop(I, 0.8, 4.4, 2.3, 1.6, 1.35, W_BRN, '#FFD98A', sign=YEL, roofc=R_RED)
    shop(I, 3.5, 4.5, 1.9, 1.5, 1.7, W_PUR, '#9FF7EA', sign=CYAN)
    I.blade(4.2, 6.0, 0.9, 1.0, RED)
    shop(I, 5.8, 4.4, 1.6, 1.7, 2.1, W_MAR, '#FFB3C7', sign=MAG, lant=False)
    I.wins_l(5.95, 7.3, 6.1, 1.35, 1.9, 0.9)
    I.ac(6.4, 5.5, 2.1)
    # street
    I.vend(3.05, 6.05, CYAN)
    I.vend(7.45, 4.9, RED)
    I.tree(1.4, 6.9)
    I.tree(6.6, 6.9)
    I.line((0.9, 6.3, 1.2), (3.6, 6.2, 1.5), '#0D0B16')
    return I


def assistent():
    I = Pix(6, seed=21)
    I.base(CYAN)
    I.road_marks(5.6, 0.5, 5.5)
    I.tower(0.8, 0.7, 2.6, 2.2, 4.4, W_PUR)
    I.ac(1.2, 2.9, 1.9)
    I.ac(2.4, 2.9, 3.1)
    I.blade(2.9, 2.9, 2.0, 1.8, MAG)
    rooftop(I, 0.8, 0.7, 4.4, 2.6, 2.2)
    I.tower(3.9, 0.9, 1.5, 2.0, 3.0, W_MAR)
    I.roof(3.9, 0.9, 3.0, 1.5, 2.0, R_NAVY, h=0.7)
    # the bright corner store
    I.box(0.8, 3.5, 0, 3.7, 1.7, 1.5, '#D8D8E6')
    I.rl(0.95, 4.35, 5.2, 0.12, 0.95, '#C8FFF6', 150)
    for x in (1.8, 2.7, 3.6):
        I.rl(x, x + 0.06, 5.2, 0.12, 0.95, '#3A6A70')
    I.rl(0.8, 4.5, 5.2, 1.3, 1.44, GREEN, 255)
    I.rl(0.8, 4.5, 5.2, 1.16, 1.3, '#FFFFFF', 200)
    I.rl(0.8, 4.5, 5.2, 1.02, 1.16, CYAN, 255)
    I.rr(4.5, 3.5, 5.2, 1.02, 1.44, sh(CYAN, 0.8), 180)
    I.rr(4.5, 3.75, 4.95, 0.15, 0.9, '#9FE8DE', 90)
    I.ac(1.3, 4.0, 1.5)
    I.ac(3.2, 4.2, 1.5)
    I.vend(4.75, 4.7, RED)
    I.vend(5.2, 4.7, CYAN)
    I.tree(5.3, 2.6)
    return I


def briefing():
    I = Pix(6, seed=31)
    I.base(YEL)
    I.tower(0.8, 0.8, 2.3, 1.9, 3.4, W_NAVY)
    px, py = I.p(1.9, 1.7, 3.75)
    I.d.ellipse([px - 6, py - 4, px + 6, py + 4], fill=I.col('#C9CCE0'))
    I.d.ellipse([px - 4, py - 2, px + 3, py + 2], fill=I.col('#8C90B0'))
    I.line((1.9, 1.7, 3.4), (1.9, 1.7, 3.7), '#8C8AA0')
    I.sign_r(3.1, 1.0, 2.5, 2.0, 3.0, RED)
    # mast
    I.box(4.0, 1.2, 0, 1.1, 1.1, 0.5, W_CON)
    for z in range(0, 8):
        a, b = (4.25, 1.75, 0.5 + z), (4.85, 1.75, 0.5 + z)
        a2, b2 = (4.3 + 0.03 * z, 1.75, 1.5 + z), (4.8 - 0.03 * z, 1.75, 1.5 + z)
        col = RED if z % 2 == 0 else '#E9E4F2'
        I.line(a, a2, col)
        I.line(b, b2, col)
        I.line(a, b2, sh(col, 0.7))
    I.dot((4.55, 1.75, 8.6), RED, 1, 255)
    I.dot((4.55, 1.75, 5.5), RED, 0, 255)
    cx, cy = I.p(4.55, 1.75, 8.6)
    for r, a in ((7, 255), (12, 170)):
        I.d.arc([cx - r, cy - r, cx + r, cy + r], 200, 250, fill=I.col(YEL))
        I.d.arc([cx - r, cy - r, cx + r, cy + r], 290, 340, fill=I.col(YEL))
        I.nd.arc([cx - r, cy - r, cx + r, cy + r], 200, 250, fill=I.col(YEL, a))
        I.nd.arc([cx - r, cy - r, cx + r, cy + r], 290, 340, fill=I.col(YEL, a))
    # news kiosk with ticker
    I.box(0.9, 3.4, 0, 2.8, 1.6, 1.35, W_TEAL)
    I.rl(1.05, 3.55, 5.0, 0.12, 0.72, '#FFE9B0', 120)
    I.sign_l(1.0, 3.6, 5.0, 0.86, 1.2, YEL)
    I.rr(3.7, 3.6, 4.8, 0.25, 0.8, '#E8C98A', 60)
    I.roof(0.9, 3.4, 1.35, 2.8, 1.6, R_NAVY, over=0.25, h=0.45)
    for i, c in enumerate(('#E9E4D2', '#D8C8A8', '#E9E4D2')):
        I.box(4.3 + i * 0.4, 4.6, 0, 0.3, 0.4, 0.3 + 0.08 * i, c, edge=False)
    I.tree(5.2, 3.2)
    return I


def onderzoeker():
    I = Pix(6, seed=41)
    I.base(PURP)
    I.tower(1.1, 0.9, 3.2, 3.0, 3.0, W_PUR, lit=0.55)
    I.sign_l(1.4, 2.6, 3.9, 1.9, 2.6, PURP)
    I.box(1.7, 1.5, 3.0, 2.0, 1.8, 0.4, '#6A6690')
    cx, cy = I.p(2.7, 2.4, 3.4)
    I.d.pieslice([cx - 13, cy - 14, cx + 13, cy + 12], 180, 360, fill=I.col('#9AA6CC'))
    I.d.pieslice([cx - 13, cy - 14, cx + 4, cy + 12], 180, 360, fill=I.col('#B8C2E2'))
    I.d.ellipse([cx - 13, cy - 5, cx + 13, cy + 5], fill=I.col('#7C86AE'))
    I.d.rectangle([cx - 2, cy - 13, cx + 2, cy - 1], fill=I.col('#14121E'))
    I.d.line([cx, cy - 7, cx - 12, cy - 21], fill=I.col('#E6E6F4'), width=2)
    I.d.point((cx - 13, cy - 22), fill=I.col(YEL))
    I.nd.ellipse([cx - 15, cy - 24, cx - 11, cy - 20], fill=I.col(YEL, 255))
    for (dx, dy) in ((-24, -30), (16, -34), (26, -22), (-6, -40)):
        I.d.point((cx + dx, cy + dy), fill=I.col('#FFFFFF'))
        I.nd.point((cx + dx, cy + dy), fill=I.col('#C9B8FF', 255))
    I.ac(3.6, 3.4, 3.0)
    shop(I, 1.0, 4.4, 2.1, 1.2, 1.15, W_MAR, '#D9C8FF', sign=PURP)
    I.vend(3.5, 4.9, PURP)
    I.tree(4.9, 4.6)
    I.tree(5.2, 1.6)
    return I


def mail():
    I = Pix(6, seed=51)
    I.base(RED)
    I.road_marks(5.6, 0.5, 5.5)
    I.tower(4.2, 0.8, 1.3, 1.8, 3.4, W_CON)
    rooftop(I, 4.2, 0.8, 3.4, 1.3, 1.8)
    I.box(0.9, 1.5, 0, 3.2, 2.7, 2.0, '#B0303E')
    I.wins_l(1.1, 3.0, 4.2, 1.2, 1.9, 0.9)
    I.wins_r(4.1, 1.8, 4.0, 0.5, 1.9, 0.7)
    I.rl(1.1, 2.3, 4.2, 0.1, 1.0, '#FFE2B8', 120)
    I.rl(1.65, 1.75, 4.2, 0.1, 1.0, '#7A2A30')
    # postal mark: white board with a bar and a T
    I.rl(2.6, 3.9, 4.2, 0.35, 1.1, '#F4F0F4', 150)
    I.line((2.8, 4.2, 0.95), (3.7, 4.2, 0.95), '#D01F35')
    I.line((2.8, 4.2, 0.8), (3.7, 4.2, 0.8), '#D01F35')
    I.line((3.25, 4.2, 0.8), (3.25, 4.2, 0.45), '#D01F35')
    I.roof(0.9, 1.5, 2.0, 3.2, 2.7, R_NAVY, h=0.9)
    I.lanterns_l(1.0, 4.0, 4.5, 1.5, 5)
    I.box(4.8, 4.5, 0, 0.42, 0.42, 0.75, '#E0323F')
    I.rl(4.86, 5.16, 4.92, 0.48, 0.56, '#2A0E14')
    I.vend(1.0, 4.9, CYAN)
    I.tree(5.2, 3.3)
    return I


def agenda():
    I = Pix(6, seed=61)
    I.base(ORA)
    for (x, y) in ((0.9, 1.0), (5.1, 1.2)):
        I.tree(x, y)
    I.box(1.5, 1.5, 0, 3.0, 3.0, 1.4, R_RED)
    I.rl(2.6, 3.4, 4.5, 0.1, 1.0, '#FFD98A', 130)
    I.wins_r(4.5, 1.8, 4.2, 0.5, 1.2, 0.8)
    I.roof(1.5, 1.5, 1.4, 3.0, 3.0, R_TEAL, over=0.5, h=0.6)
    z = 2.14
    I.box(2.0, 2.0, z, 2.0, 2.0, 1.3, '#6A3044')
    cx, cy = I.p(3.0, 4.0, z + 0.7)
    I.d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=I.col('#FFE9A8'))
    I.nd.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=I.col('#FFD25A', 230))
    I.d.line([cx, cy, cx, cy - 3], fill=I.col('#3A1A22'))
    I.d.line([cx, cy, cx + 2, cy + 1], fill=I.col('#3A1A22'))
    I.wins_r(4.0, 2.3, 3.8, z + 0.4, z + 1.1, 0.9)
    I.roof(2.0, 2.0, z + 1.3, 2.0, 2.0, R_TEAL, over=0.45, h=0.55)
    z2 = z + 1.3 + 0.69
    I.box(2.45, 2.45, z2, 1.1, 1.1, 0.9, '#7A3850')
    I.rl(2.7, 3.3, 3.55, z2 + 0.25, z2 + 0.7, '#FFC857', 160)
    I.roof(2.45, 2.45, z2 + 0.9, 1.1, 1.1, R_TEAL, over=0.4, h=0.7)
    top = z2 + 0.9 + 0.84
    I.line((3.0, 3.0, top), (3.0, 3.0, top + 0.9), YEL)
    I.dot((3.0, 3.0, top + 0.95), YEL, 1, 255)
    I.lanterns_l(1.5, 4.5, 4.8, 1.05, 5)
    for (x, y) in ((0.9, 5.0), (5.0, 5.0)):
        I.box(x, y, 0, 0.3, 0.3, 0.45, '#8C8AA0', edge=False)
        I.dot((x + 0.15, y + 0.3, 0.6), ORA, 0, 255)
    return I


def taken():
    I = Pix(6, seed=71)
    I.base(GREEN)
    I.box(0.8, 0.9, 0, 3.7, 2.7, 1.9, W_TEAL)
    for i, x in enumerate((1.0, 2.6)):
        I.rl(x, x + 1.4, 3.6, 0.1, 1.25, '#9AA0B4')
        for k in range(5):
            I.line((x, 3.6, 0.3 + 0.2 * k), (x + 1.4, 3.6, 0.3 + 0.2 * k), '#6E7488')
    I.rl(2.6, 4.0, 3.6, 0.1, 0.6, '#FFC857', 160)
    for k in range(7):
        I.rl(0.85 + k * 0.52, 1.1 + k * 0.52, 3.6, 1.42, 1.6, YEL)
    I.rr(4.5, 1.3, 3.2, 0.5, 1.3, '#F2B84B', 70)
    # rooftop sign with a check mark
    I.line((1.5, 2.2, 1.9), (1.5, 2.2, 2.6), '#8C8AA0')
    I.line((3.6, 2.2, 1.9), (3.6, 2.2, 2.6), '#8C8AA0')
    I.rl(1.2, 3.9, 2.2, 2.5, 3.8, '#10201A')
    I.line((1.9, 2.2, 3.2), (2.3, 2.2, 2.8), GREEN, 255, 2)
    I.line((2.3, 2.2, 2.8), (3.3, 2.2, 3.55), GREEN, 255, 2)
    I.ac(3.7, 1.4, 1.9)
    # yard
    for (x, y, h, c) in ((4.9, 1.2, 0.7, '#8A6A3A'), (4.9, 2.1, 0.6, '#9A7642'), (5.0, 1.3, 1.25, '#A8824A')):
        I.box(x, y, h - 0.6 if h > 1 else 0, 0.7, 0.7, 0.6, c)
    I.box(4.6, 4.3, 0, 0.8, 0.6, 0.5, '#8A6A3A')
    I.box(1.0, 4.4, 0, 0.3, 0.3, 0.55, '#3A6FB8', edge=False)
    I.box(1.45, 4.5, 0, 0.3, 0.3, 0.55, '#B83A4A', edge=False)
    for x in (2.4, 3.0, 3.6):
        I.dot((x, 5.2, 0.15), ORA, 0, 200)
    I.line((5.5, 3.4, 0), (5.5, 3.4, 2.6), '#D9B13A')
    I.line((5.5, 3.4, 2.6), (4.3, 3.4, 2.9), '#D9B13A')
    I.line((4.3, 3.4, 2.9), (4.3, 3.4, 2.2), '#8C8AA0')
    return I


def notities():
    I = Pix(6, seed=81)
    I.base(ORA)
    I.tower(4.0, 1.0, 1.4, 2.0, 2.4, W_PUR)
    I.roof(4.0, 1.0, 2.4, 1.4, 2.0, R_NAVY, h=0.6)
    I.tower(1.4, 1.2, 2.3, 2.3, 4.6, W_BRN, lit=0.95)
    I.rl(1.8, 3.3, 3.5, 0.12, 1.0, '#FFD98A', 150)
    for k in range(4):
        I.rl(1.9 + k * 0.35, 2.1 + k * 0.35, 3.5, 0.2, 0.9, [RED, BLUE, GREEN, YEL][k])
    I.blade(3.0, 3.5, 1.6, 2.2, ORA)
    I.roof(1.4, 1.2, 4.6, 2.3, 2.3, R_TEAL, over=0.45, h=0.9)
    I.lanterns_l(1.4, 3.7, 3.85, 1.25, 4, '#FF9A4A')
    # book stalls
    for i, c in enumerate((RED, BLUE, YEL, GREEN)):
        I.box(1.2 + i * 0.6, 4.6, 0, 0.5, 0.5, 0.35, '#6A4A3A', top=sh(c, 0.8), edge=False)
    I.box(4.2, 4.2, 0, 1.1, 0.9, 0.9, W_MAR)
    I.rl(4.3, 5.2, 5.1, 0.15, 0.7, '#FFE2B8', 110)
    I.tree(5.2, 3.4)
    I.tree(0.8, 5.2)
    return I


def perceel():
    I = Pix(6, seed=91)
    I.base('#6B6880', top='#2C2833', walk='#34303F')
    for k in range(6):
        I.line((0.6 + k * 0.96, 0.6, 0), (0.6 + k * 0.96, 0.6, 0.6), '#6E6A82')
        I.line((0.6, 0.6 + k * 0.96, 0), (0.6, 0.6 + k * 0.96, 0.6), '#6E6A82')
    I.line((0.6, 0.6, 0.5), (5.4, 0.6, 0.5), '#6E6A82')
    I.line((0.6, 0.6, 0.5), (0.6, 5.4, 0.5), '#6E6A82')
    I.box(1.4, 1.4, 0, 1.6, 1.2, 0.3, '#4A4658')
    I.box(1.6, 1.5, 0.3, 1.2, 1.0, 0.3, '#585468')
    I.line((4.2, 2.0, 0), (4.2, 2.0, 4.2), '#7A7690')
    I.line((4.2, 2.0, 4.2), (2.0, 2.0, 4.2), '#7A7690')
    I.line((4.2, 2.0, 4.2), (4.9, 2.0, 3.8), '#7A7690')
    I.line((2.4, 2.0, 4.2), (2.4, 2.0, 3.2), '#55516A')
    I.dot((4.2, 2.0, 4.3), YEL, 0, 255)
    I.box(2.6, 3.9, 0, 0.12, 0.12, 1.0, '#6E6A82', edge=False)
    I.rl(2.1, 3.3, 4.02, 0.8, 1.5, '#D9D4E6')
    I.line((2.7, 4.02, 1.0), (2.7, 4.02, 1.32), '#55516A')
    I.line((2.5, 4.02, 1.16), (2.9, 4.02, 1.16), '#55516A')
    for x in (4.0, 4.5, 5.0):
        I.dot((x, 4.9, 0.12), ORA, 0, 120)
    for k in range(6):
        I.line((0.6 + k * 0.96, 5.4, 0), (0.6 + k * 0.96, 5.4, 0.6), '#6E6A82')
        I.line((5.4, 0.6 + k * 0.96, 0), (5.4, 0.6 + k * 0.96, 0.6), '#6E6A82')
    I.line((0.6, 5.4, 0.5), (5.4, 5.4, 0.5), '#8C88A0')
    I.line((5.4, 0.6, 0.5), (5.4, 5.4, 0.5), '#6E6A82')
    return I


def taak():
    I = Pix(3, seed=101)
    I.base(YEL)
    I.vend(1.7, 0.7, CYAN)
    I.line((1.2, 1.6, 0), (1.2, 1.6, 2.0), '#8C8AA0')
    I.line((1.2, 1.6, 2.0), (1.2, 2.1, 2.0), '#8C8AA0')
    cx, cy = I.p(1.2, 2.1, 1.55)
    I.d.ellipse([cx - 2, cy - 3, cx + 2, cy + 3], fill=I.col('#FF4A5A'))
    I.nd.ellipse([cx - 2, cy - 3, cx + 2, cy + 3], fill=I.col('#FF3B4E', 255))
    I.d.point((cx, cy - 1), fill=I.col('#FFE2B8'))
    I.tree(0.6, 2.3, 0.5)
    return I


def school():
    I = Pix(6, seed=111)
    I.base('#7FF0E0')
    # schoolyard with a running track
    I.rt(3.6, 3.7, 5.6, 5.6, 0, '#3A2F4A')
    I.line((3.7, 3.8, 0), (5.5, 3.8, 0), '#E9E4D2')
    I.line((3.7, 5.5, 0), (5.5, 5.5, 0), '#E9E4D2')
    I.line((3.7, 3.8, 0), (3.7, 5.5, 0), '#CFCAD9')
    I.line((5.5, 3.8, 0), (5.5, 5.5, 0), '#CFCAD9')
    # long school building, three floors
    I.box(0.6, 0.8, 0, 4.6, 2.0, 2.9, '#E8E4F0')
    for z in (0.35, 1.3, 2.25):
        x = 0.85
        while x + 0.32 <= 5.05:
            on = I.r.random() < 0.8
            I.rl(x, x + 0.32, 2.8, z, z + 0.42, '#FFE9A8' if on else '#2A3048', 70 if on else 0)
            x += 0.48
    I.wins_r(5.2, 1.0, 2.6, 0.4, 2.8, 0.7)
    I.rl(2.45, 3.25, 2.8, 0, 0.75, '#2A3048')
    I.box(0.45, 0.65, 2.9, 4.9, 2.3, 0.18, '#B8B2C8')
    # clock tower in the middle
    I.box(2.3, 1.2, 3.08, 1.1, 1.1, 1.3, '#E8E4F0')
    cx, cy = I.p(2.85, 2.3, 3.8)
    I.d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=I.col('#FFFFFF'))
    I.nd.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=I.col('#BFF7FF', 150))
    I.d.line([cx, cy, cx, cy - 3], fill=I.col('#2A3048'))
    I.d.line([cx, cy, cx + 2, cy], fill=I.col('#2A3048'))
    I.roof(2.3, 1.2, 4.38, 1.1, 1.1, '#2F5D8A', over=0.3, h=0.6)
    I.sign_l(0.9, 2.1, 2.8, 2.45, 2.75, CYAN)
    # sakura tree
    I.line((1.2, 4.6, 0), (1.2, 4.6, 0.9), '#4A2E2A')
    for (dx, dy, dz, r) in ((0, 0, 1.25, 6), (-0.35, 0.2, 1.0, 4), (0.35, -0.1, 1.05, 4), (0.1, 0.3, 1.5, 4)):
        px, py = I.p(1.2 + dx, 4.6 + dy, dz)
        I.d.ellipse([px - r, py - r + 1, px + r, py + r - 1], fill=I.col('#F48FB1'))
    px, py = I.p(1.2, 4.6, 1.35)
    I.d.point((px - 2, py - 3), fill=I.col('#FFD6E6'))
    I.d.point((px + 3, py - 1), fill=I.col('#FFD6E6'))
    I.nd.ellipse([px - 7, py - 6, px + 7, py + 5], fill=I.col('#FF8FB8', 60))
    for (x, y) in ((1.9, 5.3), (2.4, 4.9), (0.8, 5.4)):
        I.d.point(I.p(x, y, 0), fill=I.col('#F48FB1'))
    # bike rack and a lantern
    for k in range(3):
        I.line((2.4 + k * 0.3, 3.5, 0), (2.4 + k * 0.3, 3.5, 0.3), '#8C8AA0')
    # bench under the tree
    I.box(1.8, 4.1, 0.25, 0.9, 0.25, 0.08, '#8E6242', edge=False)
    I.line((1.85, 4.3, 0), (1.85, 4.3, 0.25), '#4A2E2A')
    I.line((2.65, 4.3, 0), (2.65, 4.3, 0.25), '#4A2E2A')
    return I


def skyline(path):
    r = random.Random(7)
    W, H = 480, 300
    im = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(im)
    stops = [(0.0, '#06050D'), (0.45, '#140A1C'), (0.68, '#3A1026'), (0.8, '#24101F'), (1.0, '#09070F')]
    for y in range(H):
        t = int(y / H * 26) / 26
        for i in range(len(stops) - 1):
            if stops[i][0] <= t <= stops[i + 1][0]:
                a, b = stops[i], stops[i + 1]
                k = (t - a[0]) / (b[0] - a[0])
                ca, cb = rgb(a[1]), rgb(b[1])
                d.line([(0, y), (W, y)], fill=tuple(int(ca[j] + (cb[j] - ca[j]) * k) for j in range(3)))
                break
    neon = Image.new('RGB', (W, H))
    nd = ImageDraw.Draw(neon)
    for (basey, hmin, hmax, col, wcols, dens) in ((235, 50, 150, '#1B0D1F', ['#5A1F33', '#6A2A2A', '#3A1F3A'], 0.16),
                                                  (300, 40, 120, '#0B0810', ['#B8862F', '#2F8F88', '#A8324A', '#B8862F'], 0.1)):
        x = -5
        while x < W:
            w = r.randint(14, 34)
            h = r.randint(hmin, hmax)
            d.rectangle([x, basey - h, x + w, H], fill=col)
            if r.random() < 0.3:
                d.rectangle([x + 3, basey - h - 6, x + w - 3, basey - h], fill=col)
            for yy in range(basey - h + 4, min(H, basey), 4):
                for xx in range(x + 2, x + w - 1, 3):
                    if r.random() < dens:
                        d.point((xx, yy), fill=r.choice(wcols))
            if basey == 300 and r.random() < 0.35:
                c = r.choice(['#C92F4A', '#2FC9BE', '#C9A82F'])
                sx, sy = x + 2, basey - h + r.randint(6, 20)
                d.rectangle([sx, sy, sx + 2, sy + 9], fill=c)
                nd.rectangle([sx, sy, sx + 2, sy + 9], fill=c)
            x += w + r.randint(0, 3)
    S = 3
    im = im.resize((W * S, H * S), Image.NEAREST)
    neon = neon.resize((W * S, H * S), Image.NEAREST).filter(ImageFilter.GaussianBlur(9))
    from PIL import ImageChops
    im = ImageChops.screen(im, neon)
    im = im.quantize(96).convert('RGB')
    im.save(path, optimize=True)


ISLANDS = [('hub', hub), ('assistent', assistent), ('briefing', briefing), ('onderzoeker', onderzoeker), ('mail', mail),
           ('agenda', agenda), ('taken', taken), ('notities', notities), ('perceel', perceel), ('taak', taak), ('leren', school)]

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    meta = {}
    for name, fn in ISLANDS:
        meta[name] = fn().finish(os.path.join(OUT, 'stad-%s.png' % name))
    skyline(os.path.join(OUT, 'skyline.png'))
    json.dump(meta, open(os.path.join(OUT, 'meta.json'), 'w'))
    print(json.dumps(meta))
