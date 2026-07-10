"""Generate PNG/ICO favicons for Google Search and browsers."""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
PRIMARY = (99, 102, 241)
ACCENT = (168, 85, 247)
WHITE = (255, 255, 255)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            px[x, y] = (*lerp(PRIMARY, ACCENT, t), 255)
    return img


def rounded_mask(size, radius):
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def draw_cloud(draw, box):
    left, top, right, bottom = box
    w = right - left
    h = bottom - top
    cx = (left + right) // 2
    cy = (top + bottom) // 2
    r = int(min(w, h) * 0.18)
    draw.ellipse((left + int(w * 0.08), cy - r, left + int(w * 0.08) + 2 * r, cy + r), fill=WHITE)
    draw.ellipse((cx - r, top + int(h * 0.12), cx + r, top + int(h * 0.12) + 2 * r), fill=WHITE)
    draw.ellipse((right - int(w * 0.08) - 2 * r, cy - r, right - int(w * 0.08), cy + r), fill=WHITE)
    draw.rectangle((left + int(w * 0.12), cy - int(r * 0.2), right - int(w * 0.12), cy + int(r * 0.9)), fill=WHITE)
    arrow_w = int(w * 0.12)
    arrow_h = int(h * 0.22)
    ax = cx
    ay = cy + int(h * 0.08)
    draw.polygon(
        [
            (ax, ay + arrow_h),
            (ax - arrow_w, ay),
            (ax - int(arrow_w * 0.35), ay),
            (ax - int(arrow_w * 0.35), ay - arrow_h),
            (ax + int(arrow_w * 0.35), ay - arrow_h),
            (ax + int(arrow_w * 0.35), ay),
            (ax + arrow_w, ay),
        ],
        fill=WHITE,
    )


def make_icon(size):
    radius = max(4, size // 5)
    base = gradient(size)
    mask = rounded_mask(size, radius)
    icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    icon.paste(base, (0, 0), mask)
    draw = ImageDraw.Draw(icon)
    pad = size // 8
    draw_cloud(draw, (pad, pad, size - pad, size - pad))
    return icon


def save_png(path, size):
    make_icon(size).save(path, format="PNG")


def save_ico(path):
    sizes = [16, 32, 48]
    images = [make_icon(s) for s in sizes]
    images[0].save(path, format="ICO", sizes=[(s, s) for s in sizes])


def main():
    save_ico(ROOT / "favicon.ico")
    save_png(ROOT / "favicon-48x48.png", 48)
    save_png(ROOT / "apple-touch-icon.png", 180)
    save_png(ROOT / "favicon-192x192.png", 192)
    print("Generated favicon.ico, favicon-48x48.png, apple-touch-icon.png, favicon-192x192.png")


if __name__ == "__main__":
    main()
