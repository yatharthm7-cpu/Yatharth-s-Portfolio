"""Generate ScaleUpBiz's square Instagram avatar and editable SVG."""

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
    # "SUB" keeps the square avatar readable at small sizes; the full wordmark
    # lives in the launch post.
    letters = "SUB"
    font_size = 420
    font = ImageFont.truetype(str(FONT_PATH), font_size * SCALE)
    widths = [font.getlength(letter) / SCALE for letter in letters]
    gaps = [-16, -10]
    total = sum(widths) + sum(gaps)
    start = (SIZE - total) / 2
    baseline = 700

    canvas = Image.new("RGB", (SIZE * SCALE, SIZE * SCALE), BACKGROUND)
    draw = ImageDraw.Draw(canvas)

    x = start
    for index, (letter, width) in enumerate(zip(letters, widths)):
        color = VIOLET if letter == "B" else CREAM
        draw.text((round(x * SCALE), baseline * SCALE), letter, font=font, fill=color, anchor="ls")
        x += width + (gaps[index] if index < len(gaps) else 0)

    # A restrained rising curve gives the otherwise typographic avatar its own signature.
    points = []
    for index in range(121):
        t = index / 120
        x_point = 320 + 441 * t
        y_point = 780 - 60 * (3 * t * t - 2 * t * t * t)
        points.append((round(x_point * SCALE), round(y_point * SCALE)))
    draw.line(points, fill=VIOLET, width=13 * SCALE, joint="curve")
    radius = 6.5 * SCALE
    for px, py in (points[0], points[-1]):
        draw.ellipse((px - radius, py - radius, px + radius, py + radius), fill=VIOLET)

    output = canvas.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    output.save(HERE / "scaleupbiz-instagram.png", optimize=True)

    svg_letters = []
    x = start
    for index, (letter, width) in enumerate(zip(letters, widths)):
        svg_letters.append((letter, x))
        x += width + (gaps[index] if index < len(gaps) else 0)

    glyph_paths = "\n".join(
        f'  <g fill="{VIOLET if letter == "B" else CREAM}">{glyph_svg(letter, x, baseline, font_size)}</g>'
        for letter, x in svg_letters
    )
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SIZE} {SIZE}" role="img" aria-label="ScaleUpBiz logo">
  <rect width="{SIZE}" height="{SIZE}" fill="{BACKGROUND}"/>
{glyph_paths}
  <path d="M 320 780 C 467 780, 614 720, 761 720" fill="none" stroke="{VIOLET}" stroke-width="13" stroke-linecap="round"/>
</svg>
'''
    (HERE / "scaleupbiz-logo.svg").write_text(svg, encoding="utf-8")

    preview = output.resize((96, 96), Image.Resampling.LANCZOS)
    preview.save(HERE / "scaleupbiz-small-preview.png", optimize=True)


if __name__ == "__main__":
    main()
