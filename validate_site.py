#!/usr/bin/env python3
"""Check generated HTML, local links, images, feeds and sitemap without network access."""
import argparse
import sys
import xml.etree.ElementTree as ET
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

from build import SITE_URL


class Page(HTMLParser):
    def __init__(self, content):
        super().__init__()
        self.ids = []
        self.references = []
        self.images = []
        self.main_count = self.h1_count = 0
        self.language = self.description = self.title = ""
        self.in_title = False
        self.feed(content)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.append(attrs["id"])
        if tag == "a" and "name" in attrs:
            self.ids.append(attrs["name"])
        if tag == "html":
            self.language = attrs.get("lang", "")
        if tag == "title":
            self.in_title = True
        if tag == "meta" and attrs.get("name") == "description":
            self.description = attrs.get("content", "")
        if tag == "main":
            self.main_count += 1
        if tag == "h1":
            self.h1_count += 1
        if tag == "img":
            self.images.append(attrs)
        for key in ("href", "src", "poster"):
            if attrs.get(key):
                self.references.append(attrs[key])

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title += data


def validate(root):
    root = root.resolve()
    errors = []
    pages = {path: Page(path.read_text()) for path in root.rglob("*.html")}
    if root / "index.html" not in pages:
        return ["missing index.html; build the site first"], len(pages)

    def check_reference(source, reference):
        url = urlsplit(reference)
        if url.netloc and url.netloc != urlsplit(SITE_URL).netloc:
            return
        if url.scheme and url.scheme not in {"http", "https"}:
            return
        path = unquote(url.path)
        if path.startswith("/") or url.netloc:
            target = root / path.lstrip("/")
        elif path:
            target = source.parent / path
        else:
            target = source
        target = target.resolve()
        label = source.relative_to(root)
        if not target.is_relative_to(root):
            errors.append(f"{label}: link escapes site: {reference}")
            return
        if target.is_dir():
            target /= "index.html"
        if not target.is_file():
            errors.append(f"{label}: missing target: {reference}")
        elif url.fragment and target in pages and not url.fragment.startswith(":~:text="):
            fragment = unquote(url.fragment).split(":~:text=", 1)[0]
            if fragment and fragment not in pages[target].ids:
                errors.append(f"{label}: missing anchor: {reference}")

    for path, page in pages.items():
        rel = path.relative_to(root)
        content = path.read_text()
        if any(marker in content for marker in ("<!-- @include", "<!-- @posts", "<!-- @latest-posts")):
            errors.append(f"{rel}: unexpanded build marker")
        # mdBook's TOC is an iframe document, and its print page combines articles.
        is_book = len(rel.parts) >= 3 and rel.parts[0] == "blog"
        is_toc = is_book and path.name == "toc.html"
        is_print = is_book and path.name == "print.html"
        if not is_toc:
            if not page.language or not page.title.strip() or not page.description.strip():
                errors.append(f"{rel}: missing language, title or description")
            if page.main_count != 1:
                errors.append(f"{rel}: expected one main landmark, found {page.main_count}")
            if not is_book and page.h1_count != 1:
                errors.append(f"{rel}: expected one primary heading, found {page.h1_count}")
        if not is_print:
            for identifier, count in Counter(page.ids).items():
                if count > 1:
                    errors.append(f"{rel}: duplicate id: {identifier}")
        for img in page.images:
            if "alt" not in img:
                errors.append(f"{rel}: image missing alt attribute: {img.get('src')}")
        for reference in page.references:
            check_reference(path, reference)

    for name in ("feed.xml", "sitemap.xml"):
        source = root / name
        try:
            xml = ET.parse(source).getroot()
        except (OSError, ET.ParseError) as error:
            errors.append(f"{name}: {error}")
            continue
        if name == "feed.xml":
            items = xml.findall("channel/item")
            if xml.tag != "rss" or not items:
                errors.append("feed.xml: expected an RSS feed with article entries")
            urls = [item.findtext("link", "") for item in items]
        else:
            ns = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
            urls = [node.text or "" for node in xml.findall(f"{ns}url/{ns}loc")]
            if xml.tag != ns + "urlset" or not urls:
                errors.append("sitemap.xml: expected a non-empty sitemap")
        if len(urls) != len(set(urls)):
            errors.append(f"{name}: duplicate URLs")
        for url in urls:
            if not url.startswith(SITE_URL + "/"):
                errors.append(f"{name}: expected an absolute site URL: {url}")
            else:
                check_reference(source, url)
    return errors, len(pages)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", nargs="?", type=Path, default=Path(__file__).parent / "_site")
    args = parser.parse_args()
    errors, count = validate(args.directory)
    if errors:
        for error in errors:
            print(f"error: {error}", file=sys.stderr)
        sys.exit(1)
    print(f"Validated {count} HTML pages, local targets and anchors, RSS and sitemap.")


if __name__ == "__main__":
    main()
