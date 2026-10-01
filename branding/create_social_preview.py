"""Render the portfolio's 1200 x 630 sharing card without a network request.

Uses Pillow and Windows Segoe UI fonts. Override --font-dir on other systems
with a directory containing segoeui.ttf, seguisb.ttf and segoeuib.ttf.
"""

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--font-dir", type=Path, default=Path("C:/Windows/Fonts"))
    args = parser.parse_args()
    scale = 3
    background, cream, violet, muted = "#141416", "#F3F0E9", "#B5A1DA", "#B6B3BD"
    canvas = Image.new("RGB", (1200 * scale, 630 * scale), background)
    draw = ImageDraw.Draw(canvas)

    def font(size: int, weight: str = "regular"):
        filename = {"regular": "segoeui.ttf", "semibold": "seguisb.ttf", "bold": "segoeuib.ttf"}[weight]
        return ImageFont.truetype(str(args.font_dir / filename), size * scale)

    def text(x, y, value, size, color=cream, weight="regular"):
        draw.text((x * scale, y * scale), value, font=font(size, weight), fill=color, anchor="lt")

    def line(points, color, width):
        draw.line([(x * scale, y * scale) for x, y in points], fill=color, width=width * scale, joint="curve")

    # The wordmark and colours follow the existing ScaleUpBiz launch artwork.
    draw.rounded_rectangle((24 * scale, 24 * scale, 1176 * scale, 606 * scale), radius=20 * scale, outline="#35313D", width=scale)
    text(64, 64, "YATHARTH MEHTA / PORTFOLIO", 20, muted, "semibold")
    text(886, 65, "@scaleup.biz.in", 23, violet)
    text(64, 136, "ScaleUp", 106, cream, "bold")
    brand_width = draw.textlength("ScaleUp", font=font(106, "bold")) / scale
    text(64 + brand_width, 136, "Biz.", 106, violet, "bold")
    text(68, 272, "Websites. Strategy. Growth.", 44, cream, "semibold")

    # A rising curve echoes the existing brand asset, without adding a new logo.
    curve = []
    for index in range(121):
        t = index / 120
        curve.append((70 + 600 * t, 352 - 32 * (3 * t * t - 2 * t * t * t)))
    line(curve, violet, 5)

    draw.ellipse((934 * scale, 151 * scale, 1112 * scale, 329 * scale), fill="#211D29", outline="#514560", width=scale)
    line([(983, 280), (1064, 199), (1064, 252)], violet, 7)
    line([(1011, 199), (1064, 199)], violet, 7)

    text(68, 402, "Website development  ·  Sales strategy  ·  NFC design", 28, cream)
    text(68, 444, "Social media marketing  ·  Digital marketing", 28, muted)
    line([(68, 517), (1132, 517)], "#35313D", 1)
    text(68, 549, "scaleupbiz.co.in", 26, violet, "semibold")
    text(843, 552, "INDIA / WORLDWIDE", 19, muted, "semibold")

    output = canvas.resize((1200, 630), Image.Resampling.LANCZOS)
    destination = Path(__file__).resolve().parent / "scaleupbiz-social-preview.png"
    output.save(destination, optimize=True)
    print(f"Created {destination.name}: 1200 x 630, {destination.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
