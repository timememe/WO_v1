"""Generate Open Graph share cards for getabuff buffs.

Output: react-app/public/assets/getabuff/og/<NN>.jpg (one per buff, index-ordered)
        plus cover.jpg for the generic /getabuff card.

Each card is 1200x630: cream editorial background with a soft top glow, the
item art centred with a drop shadow, a thin rarity-coloured accent bar, and a
small "getabuff" wordmark. Text-free on purpose so one image set serves both
RU and EN (the buff name/description ride in the OG <meta> tags instead).

Re-run whenever the sprite sheets or the buff order change:
    python react-app/scripts/gen-getabuff-og.py
"""
import json
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.normpath(os.path.join(HERE, "..", "public", "assets", "getabuff"))
OUT = os.path.join(ASSETS, "og")
os.makedirs(OUT, exist_ok=True)

W, H = 1200, 630
CELL = 627
RARITY = {
    "common": (143, 136, 123),
    "rare": (90, 120, 150),
    "epic": (124, 111, 150),
    "legendary": (168, 129, 63),
}
MUTED = (124, 116, 105)
GEORGIA_I = r"C:\Windows\Fonts\georgiai.ttf"

manifest = json.load(open(os.path.join(ASSETS, "spritesheets.json"), encoding="utf-8"))
slots = [s for sheet in manifest["sheets"] for s in sheet["slots"] if s]


def vgrad(top, bot):
    g = Image.new("RGB", (1, H))
    for y in range(H):
        f = y / (H - 1)
        g.putpixel((0, y), tuple(round(top[i] + (bot[i] - top[i]) * f) for i in range(3)))
    return g.resize((W, H))


def glow():
    m = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(m)
    cx, cy = W // 2, int(H * 0.16)
    rx, ry = int(W * 0.55), int(H * 0.75)
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=255)
    m = m.filter(ImageFilter.GaussianBlur(140)).point(lambda v: int(v * 0.5))
    return Image.new("RGB", (W, H), (255, 255, 255)), m


def cell_image(idx):
    sheet_n = idx // 4 + 1
    col, row = (idx % 4) % 2, (idx % 4) // 2
    sheet = Image.open(os.path.join(ASSETS, f"getabuff-items-{sheet_n:02d}.png")).convert("RGBA")
    return sheet.crop((col * CELL, row * CELL, col * CELL + CELL, row * CELL + CELL))


def compose(item_rgba, rarity, size):
    base = vgrad((250, 248, 244), (241, 238, 231)).convert("RGB")
    gw, gm = glow()
    base = Image.composite(gw, base, gm).convert("RGBA")

    ImageDraw.Draw(base).rectangle([0, 0, W, 6], fill=RARITY[rarity] + (255,))

    it = item_rgba.resize((size, size), Image.LANCZOS)
    x, y = (W - size) // 2, (H - size) // 2 - 14

    alpha = it.split()[3]
    sh = Image.composite(Image.new("RGBA", it.size, (20, 16, 10, 255)),
                         Image.new("RGBA", it.size, (0, 0, 0, 0)), alpha)
    sh = sh.filter(ImageFilter.GaussianBlur(20))
    sh.putalpha(sh.split()[3].point(lambda v: int(v * 0.26)))
    base.alpha_composite(sh, (x, y + 26))
    base.alpha_composite(it, (x, y))

    d = ImageDraw.Draw(base)
    f = ImageFont.truetype(GEORGIA_I, 30)
    track = 7
    widths = [d.textlength(ch, font=f) for ch in "getabuff"]
    cx = (W - (sum(widths) + track * 7)) / 2
    for ch, cw in zip("getabuff", widths):
        d.text((cx, H - 64), ch, font=f, fill=MUTED)
        cx += cw + track

    return base.convert("RGB")


for idx, slot in enumerate(slots):
    compose(cell_image(idx), slot["rarity"], 470).save(
        os.path.join(OUT, f"{idx:02d}.jpg"), quality=88, optimize=True)

cover = next(i for i, s in enumerate(slots) if s["item"].startswith("Философский камень"))
compose(cell_image(cover), slots[cover]["rarity"], 500).save(
    os.path.join(OUT, "cover.jpg"), quality=90, optimize=True)

files = sorted(os.listdir(OUT))
kb = sum(os.path.getsize(os.path.join(OUT, f)) for f in files) / 1024
print(f"wrote {len(files)} files to {OUT} ({kb:.0f} KB total)")
