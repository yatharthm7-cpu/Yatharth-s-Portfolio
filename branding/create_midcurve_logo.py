"""Generate Midcurve Five's square Instagram avatar and editable SVG."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen


HERE = Path(__file__).resolve().parent
SIZE = 1080
SCALE = 3
BACKGROUND = "#141416"
CREAM = "#F3F0E9"
VIOLET = "#B5A1DA"
FONT_PATH = Path(r"C:\Windows\Fonts\seguibl.ttf")


def glyph_svg(character: str, x: float, y: float, size: int) -> str:
    font = TTFont(FONT_PATH)
    units = font["head"].unitsPerEm
    cmap = font.getBestCmap()
    name = cmap[ord(character)]
    glyph_set = font.getGlyphSet()
    pen = SVGPathPen(glyph_set)
    glyph_set[name].draw(pen)
    scale = size / units
    return (
        f'<path d="{pen.getCommands()}" '
        f'transform="translate({x:.2f} {y:.2f}) scale({scale:.7f} {-scale:.7f})"/>'
    )


def main() -> None:
    font_size = 466
    font = ImageFont.truetype(str(FONT_PATH), font_size * SCALE)
    bbox_m = font.getbbox("M", anchor="ls")
    bbox_five = font.getbbox("5", anchor="ls")
    width_m = font.getlength("M") / SCALE
    width_five = font.getlength("5") / SCALE
    gap = -13
    start = (SIZE - width_m - width_five - gap) / 2
    baseline = 686

    canvas = Image.new("RGB", (SIZE * SCALE, SIZE * SCALE), BACKGROUND)
    draw = ImageDraw.Draw(canvas)
    draw.text((round(start * SCALE), baseline * SCALE), "M", font=font, fill=CREAM, anchor="ls")
    draw.text((round((start + width_m + gap) * SCALE), baseline * SCALE), "5", font=font, fill=VIOLET, anchor="ls")

    # A restrained rising curve gives the otherwise typographic avatar its own signature.
    points = []
    for index in range(121):
        t = index / 120
        x = 320 + 441 * t
        y = 750 - 42 * (3 * t * t - 2 * t * t * t)
        points.append((round(x * SCALE), round(y * SCALE)))
    draw.line(points, fill=VIOLET, width=13 * SCALE, joint="curve")
    radius = 6.5 * SCALE
    for px, py in (points[0], points[-1]):
        draw.ellipse((px-radius, py-radius, px+radius, py+radius), fill=VIOLET)

    output = canvas.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    output.save(HERE / "midcurve-five-instagram.png", optimize=True)

    svg_m = glyph_svg("M", start, baseline, font_size)
    svg_five = glyph_svg("5", start + width_m + gap, baseline, font_size)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SIZE} {SIZE}" role="img" aria-label="Midcurve Five logo">
  <rect width="{SIZE}" height="{SIZE}" fill="{BACKGROUND}"/>
  <g fill="{CREAM}">{svg_m}</g>
  <g fill="{VIOLET}">{svg_five}</g>
  <path d="M 320 750 C 467 750, 614 708, 761 708" fill="none" stroke="{VIOLET}" stroke-width="13" stroke-linecap="round"/>
</svg>
'''
    (HERE / "midcurve-five-logo.svg").write_text(svg, encoding="utf-8")

    preview = output.resize((96, 96), Image.Resampling.LANCZOS)
    preview.save(HERE / "midcurve-five-small-preview.png", optimize=True)


if __name__ == "__main__":
    main()
