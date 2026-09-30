"""Generate the ScaleUpBiz Instagram launch post (1122x1402) and avatar."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
W, H = 1122, 1402
SCALE = 3
BACKGROUND = "#141416"
CREAM = "#F3F0E9"
VIOLET = "#B5A1DA"
FONT_PATH = Path(r"C:\Windows\Fonts\seguibl.ttf")
BODY_FONT_PATH = Path(r"C:\Windows\Fonts\seguisb.ttf")


def font(size: int, path: Path = FONT_PATH) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size * SCALE)


def main() -> None:
    canvas = Image.new("RGB", (W * SCALE, H * SCALE), BACKGROUND)
    draw = ImageDraw.Draw(canvas)

    # Wordmark, stacked so the tagline has room beneath it.
    title_font = font(150)
    title_lines = ["ScaleUp", "Biz."]
    widths = [title_font.getlength(line) / SCALE for line in title_lines]
    line_height = 168
    start_y = 430
    for index, (line, width) in enumerate(zip(title_lines, widths)):
        x = (W - width) / 2
        y = start_y + index * line_height
        color = CREAM if index == 0 else VIOLET
        draw.text((round(x * SCALE), y * SCALE), line, font=title_font, fill=color, anchor="ls")

    # The rising curve sits between the wordmark and the tagline.
    points = []
    for index in range(121):
        t = index / 120
        x = 261 + 600 * t
        y = (start_y + 2 * line_height + 90) - 34 * (3 * t * t - 2 * t * t * t)
        points.append((round(x * SCALE), round(y * SCALE)))
    draw.line(points, fill=VIOLET, width=12 * SCALE, joint="curve")
    radius = 6 * SCALE
    for px, py in (points[0], points[-1]):
        draw.ellipse((px - radius, py - radius, px + radius, py + radius), fill=VIOLET)

    # Tagline.
    tagline_font = font(74, BODY_FONT_PATH)
    tagline = "Smart Services. Real Biz. Growth."
    tagline_width = tagline_font.getlength(tagline) / SCALE
    draw.text(
        (round(((W - tagline_width) / 2) * SCALE), (start_y + 2 * line_height + 210) * SCALE),
        tagline, font=tagline_font, fill=CREAM, anchor="ls",
    )

    # Footer call to action.
    footer_font = font(46, BODY_FONT_PATH)
    footer = "scaleupbiz.co.in"
    footer_width = footer_font.getlength(footer) / SCALE
    draw.text(
        (round(((W - footer_width) / 2) * SCALE), (H - 170) * SCALE),
        footer, font=footer_font, fill=VIOLET, anchor="ls",
    )

    output = canvas.resize((W, H), Image.Resampling.LANCZOS)
    output.save(HERE / "scaleupbiz-launch-post.png", optimize=True)


if __name__ == "__main__":
    main()
