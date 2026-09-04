#!/usr/bin/env python3
"""Megacity favicon + apple-touch-icon from the brand mark.
     python3 scripts/megacity-icons.py
   Writes templates/assets/mcr/favicon.ico (16/32/48, transparent) and
   templates/assets/mcr/apple-touch-icon.png (180x180, navy ground)."""
from PIL import Image
import pathlib

MCR = pathlib.Path(__file__).resolve().parent.parent / "templates" / "assets" / "mcr"
NAVY = (33, 29, 80, 255)   # theme-color #211D50

def fit(src, box, pad):
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    scale = min((box - 2 * pad) / w, (box - 2 * pad) / h)
    im = im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    return im

# favicon: the coloured mark on a transparent square
sizes = [16, 32, 48]
frames = []
for s in sizes:
    canvas = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    m = fit(MCR / "mark.png", s, 1 if s < 32 else 2)
    canvas.paste(m, ((s - m.width) // 2, (s - m.height) // 2), m)
    frames.append(canvas)
frames[-1].save(MCR / "favicon.ico", format="ICO", sizes=[(s, s) for s in sizes], append_images=frames[:-1])

# apple-touch-icon: the white mark on the navy ground (iOS ignores transparency)
s = 180
canvas = Image.new("RGBA", (s, s), NAVY)
m = fit(MCR / "mark-white.png", s, 30)
canvas.paste(m, ((s - m.width) // 2, (s - m.height) // 2), m)
canvas.convert("RGB").save(MCR / "apple-touch-icon.png", format="PNG", optimize=True)
print("wrote", MCR / "favicon.ico", "and", MCR / "apple-touch-icon.png")
