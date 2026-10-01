"""Check crawlable content, schema references, sitemap and local SEO assets."""
import json
import re
import struct
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://scaleupbiz.co.in/"


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.tags, self.ids, self.text, self.scripts = [], set(), [], []
        self.script, self.body = None, False
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags.append((tag, attrs))
        if attrs.get("id"):
            assert attrs["id"] not in self.ids, "Duplicate HTML id"
            self.ids.add(attrs["id"])
        if tag == "body": self.body = True
        if tag == "script": self.script = [attrs, ""]

    def handle_endtag(self, tag):
        if tag == "script" and self.script:
            self.scripts.append(self.script)
            self.script = None

    def handle_data(self, data):
        if self.script is not None: self.script[1] += data
        elif self.body: self.text.append(data)


page = Page((ROOT / "index.html").read_text(encoding="utf-8"))
metadata = [attrs for tag, attrs in page.tags if tag == "meta"]
keys = [attrs.get("name") or attrs.get("property") for attrs in metadata]
assert len(keys) == len(set(keys)), "Duplicate metadata"
meta = {attrs.get("name") or attrs.get("property"): attrs["content"] for attrs in metadata if "content" in attrs}
assert "noindex" not in meta.get("robots", "")
assert sum(tag == "h1" for tag, attrs in page.tags) == 1
assert [attrs["href"] for tag, attrs in page.tags if tag == "link" and attrs.get("rel") == "canonical"] == [BASE]
assert meta["og:url"] == BASE
assert meta["og:image"] == meta["twitter:image"]
for tag, attrs in page.tags:
    if tag == "img":
        assert attrs.get("alt") and attrs.get("width") and attrs.get("height"), "Image needs descriptive alt and reserved space"
    for key in ("src", "href"):
        value = attrs.get(key, "")
        parsed = urlparse(value)
        if value.startswith("#"): assert parsed.fragment in page.ids, f"Broken section link: {value}"
        elif value and not parsed.scheme and parsed.path:
            assert (ROOT / parsed.path.lstrip("/")).exists(), f"Missing asset: {value}"
    for candidate in attrs.get("srcset", "").split(","):
        if candidate.strip(): assert (ROOT / candidate.strip().split()[0]).exists(), "Missing responsive image"
schema = [json.loads(text) for attrs, text in page.scripts if attrs.get("type") == "application/ld+json"]
assert len(schema) == 1
graph = schema[0]["@graph"]
schema_ids = {item["@id"] for item in graph}
assert len(schema_ids) == len(graph)


def check_references(item):
    if isinstance(item, dict):
        if set(item) == {"@id"}: assert item["@id"] in schema_ids, "Dangling schema reference"
        for key, value in item.items():
            assert key not in ("aggregateRating", "review"), "Don't invent search ratings"
            if key in ("logo", "image") and isinstance(value, str) and value.startswith(BASE):
                assert (ROOT / value[len(BASE):]).exists(), "Missing structured-data image"
            check_references(value)
    elif isinstance(item, list):
        for value in item: check_references(value)


check_references(graph)
organization = next(item for item in graph if item["@type"] == "Organization")
body = " ".join(page.text).casefold()
assert organization["name"].casefold() in body
for offer in organization["hasOfferCatalog"]["itemListElement"]:
    service = offer["itemOffered"]
    assert service["name"].casefold() in body, "Schema service must appear in visible HTML"
    assert urlparse(service["url"]).fragment in page.ids
sitemap = ET.parse(ROOT / "sitemap.xml")
assert [item.text for item in sitemap.findall(".//{http://www.sitemaps.org/schemas/sitemap/0.9}loc")] == [BASE]
robots = (ROOT / "robots.txt").read_text()
assert "Sitemap: " + BASE + "sitemap.xml" in robots
assert not re.search(r"^Disallow:\s*/(?:admin|\s*$)", robots, re.M), "Crawlers need access to read admin noindex"
for route in ("admin/index.html", "404.html"):
    excluded = Page((ROOT / route).read_text(encoding="utf-8"))
    assert any(tag == "meta" and attrs.get("name") == "robots" and "noindex" in attrs.get("content", "") for tag, attrs in excluded.tags)
icon = ROOT / next(attrs["href"].lstrip("/") for tag, attrs in page.tags if tag == "link" and attrs.get("rel") == "icon")
data = icon.read_bytes()
assert data[:8] == b"\x89PNG\r\n\x1a\n"
assert struct.unpack(">II", data[16:24]) == (96, 96)
print("PASS: crawlable service content, linked schema, sitemap, section links, image assets and excluded utility pages.")
