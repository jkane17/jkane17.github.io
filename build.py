#!/usr/bin/env python3
"""Build the site into _site/.

- Copies assets/, the root index.html and every top-level directory that has an
  index.html (so adding a page is just adding its directory).
- Expands `<!-- @include path/to/partial.html -->` markers in those pages, so
  shared markup such as the nav and footer lives in one file under partials/.
- Marks the current page's nav link and fills in the footer year.
- Adds a content hash to /assets/ URLs (e.g. /assets/nav.js?v=1a2b3c4d) so browsers
  never mix a cached old script or stylesheet with a newly deployed page.
- Builds every mdBook under src/blog/ into _site/blog/<name>/.
- Generates article lists, sidebar summaries, RSS and a sitemap from posts.json.
- Adds link-preview (Open Graph) tags to each blog post, using its metadata and first image as the
  preview picture (rendered to a 1200x630 JPEG, since not all sites accept WebP).

Used by both the deploy workflow and local_test.sh.
"""

import datetime
import hashlib
import html
import json
import re
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from email.utils import format_datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "_site"
SITE_URL = "https://jkane17.github.io"

# Top-level directories that are never published, even if they contain an index.html
EXCLUDED_DIRS = {"src", "partials"}

INCLUDE = re.compile(r"^([ \t]*)<!--\s*@include\s+(\S+)\s*-->[ \t]*$", re.MULTILINE)


def expand_includes(html, source):
    def replace(match):
        indent, rel = match.groups()
        partial = ROOT / rel
        if not partial.is_file():
            sys.exit(f"error: {source}: included file not found: {rel}")
        lines = expand_includes(partial.read_text(), rel).rstrip("\n").split("\n")
        return "\n".join(indent + line if line else line for line in lines)

    return INCLUDE.sub(replace, html)


def mark_active_nav_link(html, url_path):
    # Nav links are written as class="nav-link" data-path="/section/" in partials/nav.html
    nav_path = "/projects/" if url_path in {"/quill/", "/qlib/"} else url_path
    current = "page" if nav_path == url_path else "location"
    return html.replace(
        f'class="nav-link" data-path="{nav_path}"',
        f'class="nav-link active" aria-current="{current}" data-path="{nav_path}"',
    )


def fill_year(html):
    return html.replace('<span id="year"></span>', f'<span id="year">{datetime.date.today().year}</span>')


ASSET_URL = re.compile(r'((?:src|href)=")(/assets/[^"?#]+)(")')


def version_assets(html, source):
    def replace(match):
        before, url, after = match.groups()
        asset = OUT / url.lstrip("/")
        if not asset.is_file():
            sys.exit(f"error: {source}: referenced asset not found: {url}")
        digest = hashlib.sha256(asset.read_bytes()).hexdigest()[:8]
        return f"{before}{url}?v={digest}{after}"

    return ASSET_URL.sub(replace, html)


def page_dirs():
    for path in sorted(ROOT.iterdir()):
        if (
            path.is_dir()
            and not path.name.startswith((".", "_"))
            and path.name not in EXCLUDED_DIRS
            and (path / "index.html").is_file()
        ):
            yield path


def build_pages():
    shutil.copytree(ROOT / "assets", OUT / "assets")
    shutil.copy2(ROOT / "index.html", OUT / "index.html")
    for directory in page_dirs():
        shutil.copytree(directory, OUT / directory.name)

    for page in sorted(OUT.rglob("*.html")):
        if page.is_relative_to(OUT / "assets"):
            continue
        rel = page.relative_to(OUT)
        url_path = "/" + str(rel.parent) + "/" if rel.name == "index.html" else "/" + str(rel)
        url_path = url_path.replace("/./", "/")
        html = page.read_text()
        html = expand_includes(html, rel)
        html = mark_active_nav_link(html, url_path)
        html = fill_year(html)
        html = version_assets(html, rel)
        page.write_text(html)
        print(f"  page  {url_path}")


@dataclass(frozen=True)
class Post:
    book: str
    slug: str
    title: str
    date: str
    description: str
    published: datetime.date

    @property
    def path(self):
        return f"/blog/{self.book}/{self.slug}.html"


def load_posts(book):
    """Validate the publication list before writing any build output."""
    source = book.parent / "posts.json"
    try:
        rows = json.loads(source.read_text())
    except (OSError, ValueError) as error:
        sys.exit(f"error: {source}: {error}")
    if not isinstance(rows, list) or not rows:
        sys.exit(f"error: {source}: expected a non-empty list of posts")
    posts, slugs = [], set()
    fields = {"slug", "title", "date", "description"}
    for row in rows:
        if not isinstance(row, dict) or set(row) != fields or any(
            not isinstance(value, str) or not value.strip() or "\n" in value or "\r" in value
            for value in row.values()
        ):
            sys.exit(f"error: {source}: each post needs non-empty slug, title, date and description strings")
        slug = row["slug"]
        if not re.fullmatch(r"[\w-]+", slug) or slug in {"index", "introduction", "SUMMARY", "print", "toc", "404"}:
            sys.exit(f"error: {source}: invalid or reserved slug: {slug}")
        if slug in slugs:
            sys.exit(f"error: {source}: duplicate slug: {slug}")
        if not (book.parent / "src" / f"{slug}.md").is_file():
            sys.exit(f"error: {source}: missing article: {slug}.md")
        try:
            published = datetime.datetime.strptime(row["date"], "%b %d, %Y").date()
        except ValueError:
            sys.exit(f"error: {source}: invalid date for {slug}; use e.g. Nov 17, 2026")
        slugs.add(slug)
        posts.append(Post(book=book.parent.name, published=published, **row))
    # Stable ordering preserves the metadata order for articles published the same day.
    return sorted(posts, key=lambda post: post.published, reverse=True)


def markdown_text(text):
    """Treat metadata as plain text inside generated Markdown links and tables."""
    return re.sub(r"([\\`*_{}\[\]()#+.!|~-])", r"\\\1", html.escape(text, quote=False))


def prepare_book_source(staged, posts):
    summary = "\n".join(f"[{markdown_text(p.title)}](./{p.slug}.md)" for p in posts)
    table = "| Title | Published | Description |\n| --- | --- | --- |\n"
    table += "\n".join(
        f"| **[{markdown_text(p.title)}](./{p.slug}.md)** | {p.date} | {markdown_text(p.description)} |"
        for p in posts
    )
    for name, replacement in (("SUMMARY.md", summary), ("introduction.md", table)):
        page = staged / "src" / name
        content = page.read_text()
        if content.count("<!-- @posts -->") != 1:
            sys.exit(f"error: {name}: expected one @posts marker")
        page.write_text(content.replace("<!-- @posts -->", replacement))


def build_books(books):
    if shutil.which("mdbook") is None:
        sys.exit("error: mdbook is not installed (install it with: cargo install mdbook)")
    for book, posts in books.items():
        name = book.parent.name
        # Generate Markdown in a temporary copy, never rewrite tracked sources during a build.
        with tempfile.TemporaryDirectory(prefix="site-book-") as temp:
            staged = Path(temp) / name
            shutil.copytree(book.parent, staged)
            prepare_book_source(staged, posts)
            result = subprocess.run(
                ["mdbook", "build", "-d", str(OUT / "blog" / name), str(staged)],
                capture_output=True,
                text=True,
            )
        if result.returncode != 0:
            sys.stderr.write(result.stdout + result.stderr)
            sys.exit(f"error: failed to build book '{name}'")
        print(f"  book  /blog/{name}/")
        add_book_navigation(OUT / "blog" / name)
        prepare_book_images(OUT / "blog" / name)
        add_post_previews(book.parent / "src", OUT / "blog" / name, posts)


class ImageTagParser(HTMLParser):
    def handle_starttag(self, tag, attrs):
        self.attrs = dict(attrs)


def prepare_book_images(book_out):
    """Reserve image space and defer below-the-cover images without changing charts."""
    from PIL import Image

    dimensions = {}
    for page in book_out.rglob("*.html"):
        image_count = 0

        def prepare(match):
            nonlocal image_count
            image_count += 1
            parser = ImageTagParser()
            parser.feed(match.group())
            attrs = parser.attrs
            url = urlsplit(attrs.get("src", ""))
            if not url.scheme and not url.netloc and url.path:
                image = (OUT / unquote(url.path).lstrip("/") if url.path.startswith("/")
                         else page.parent / unquote(url.path)).resolve()
                if not image.is_file():
                    sys.exit(f"error: {page.relative_to(OUT)}: image not found: {url.path}")
                if image.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp", ".gif"}:
                    if image not in dimensions:
                        with Image.open(image) as im:
                            dimensions[image] = im.size
                    width, height = dimensions[image]
                    # Respect any author-specified display dimensions.
                    if "width" not in attrs and "height" not in attrs:
                        attrs.update(width=str(width), height=str(height))
            attrs["loading"] = "eager" if image_count == 1 or page.name == "print.html" else "lazy"
            return "<img " + " ".join(
                key if value is None else f'{key}="{html.escape(value, quote=True)}"'
                for key, value in attrs.items()
            ) + ">"

        content = re.sub(r"<img\b[^>]*>", prepare, page.read_text(), flags=re.IGNORECASE)
        page.write_text(content)


def add_book_navigation(book_out):
    """Add toolbar links and version the early theme bridge script."""
    navigation = (ROOT / "partials/blog-nav.html").read_text()
    for page in book_out.rglob("*.html"):
        content = page.read_text()
        toolbar = '<div class="right-buttons">'
        if "<main>" in content and content.count(toolbar) != 1:
            sys.exit(f"error: {page.relative_to(OUT)}: expected one mdBook toolbar")
        content = content.replace(toolbar, toolbar + "\n" + navigation, 1)
        content = version_assets(content, page.relative_to(OUT))
        page.write_text(content)


FIRST_IMAGE = re.compile(r"!\[[^\]]*\]\(\./(images/[^\s)]+)")
PREVIEW_SIZE = (1200, 630)


def render_preview_image(cover, dest):
    """Fit the whole cover onto a 1200x630 canvas over a blurred, darkened copy of itself."""
    from PIL import Image, ImageEnhance, ImageFilter, ImageOps

    im = Image.open(cover).convert("RGB")
    background = ImageOps.fit(im, PREVIEW_SIZE).filter(ImageFilter.GaussianBlur(30))
    background = ImageEnhance.Brightness(background).enhance(0.5)
    foreground = ImageOps.contain(im, PREVIEW_SIZE)
    background.paste(foreground, ((PREVIEW_SIZE[0] - foreground.width) // 2, (PREVIEW_SIZE[1] - foreground.height) // 2))
    background.save(dest, quality=85, optimize=True, progressive=True)


def preview_tags(title, description, url, image_url, published):
    tags = {
        "og:type": "article",
        "og:site_name": "jkane17",
        "og:title": title,
        "og:description": description,
        "og:url": url,
    }
    if image_url:
        tags.update({"og:image": image_url, "og:image:width": str(PREVIEW_SIZE[0]), "og:image:height": str(PREVIEW_SIZE[1])})
    if published:
        tags["article:published_time"] = published
    lines = [f'<link rel="canonical" href="{html.escape(url)}">']
    lines += [f'<meta property="{k}" content="{html.escape(v)}">' for k, v in tags.items()]
    lines.append('<meta name="twitter:card" content="summary_large_image">')
    return "\n        ".join(lines)


def add_post_previews(book_src, book_out, posts):
    for post in posts:
        title, slug, description = post.title, post.slug, post.description
        page = book_out / f"{slug}.html"
        source = book_src / f"{slug}.md"
        if not page.is_file():
            sys.exit(f"error: generated post not found: {page}")

        image_url = None
        cover = FIRST_IMAGE.search(source.read_text())
        if cover:
            preview = book_out / "images" / f"{slug}.preview.jpg"
            render_preview_image(book_src / cover.group(1), preview)
            image_url = f"{SITE_URL}/blog/{post.book}/images/{preview.name}"

        page_html = page.read_text()
        # Replace the book-wide description with the post's own, then add the preview tags
        page_html, n = re.subn(
            r'<meta name="description" content="[^"]*">',
            lambda _: f'<meta name="description" content="{html.escape(description)}">\n        '
            + preview_tags(title, description, SITE_URL + post.path, image_url, post.published.isoformat()),
            page_html,
            count=1,
        )
        if n != 1:
            sys.exit(f"error: {page.relative_to(ROOT)}: no description meta tag to replace")
        page.write_text(page_html)
        print(f"  preview  {slug}{'' if image_url else ' (no image)'}")


def add_analytics():
    """Include analytics on both regular pages and generated mdBook pages."""
    for page in sorted(OUT.rglob("*.html")):
        if page.is_relative_to(OUT / "assets"):
            continue
        script = version_assets(
            '<script defer src="/assets/analytics.js"></script>', page.relative_to(OUT)
        )
        content = page.read_text()
        if "</body>" in content:
            page.write_text(content.replace("</body>", script + "\n</body>", 1))


def add_latest_posts(posts):
    """Render the latest three posts into the homepage and blog index."""
    cards = []
    for post in posts[:3]:
        title, href, date, description = post.title, post.path, post.date, post.description
        cards.append(
            f'<a class="blog-post-item" href="{html.escape(href)}">\n'
            '    <div class="post-header">\n'
            f'        <h3 class="post-title">{html.escape(title)}</h3>\n'
            f'        <span class="post-date">{html.escape(date)}</span>\n'
            '    </div>\n'
            f'    <p class="post-snippet">{html.escape(description)}</p>\n'
            '</a>'
        )
    marker = "<!-- @latest-posts -->"
    rendered = "\n                        ".join("\n".join(cards).splitlines())
    for rel in ("index.html", "blog/index.html"):
        page = OUT / rel
        content = page.read_text()
        if content.count(marker) != 1:
            sys.exit(f"error: /{rel} must contain exactly one @latest-posts marker")
        page.write_text(content.replace(marker, rendered))
    print(f"  latest  {len(cards)} posts")


def write_discovery_files(books, posts):
    """Publish summary RSS and canonical page URLs, excluding mdBook utility pages."""
    atom = "http://www.w3.org/2005/Atom"
    ET.register_namespace("atom", atom)
    rss = ET.Element("rss", version="2.0")
    channel = ET.SubElement(rss, "channel")
    for key, value in (
        ("title", "Jonathan Kane — Articles"),
        ("link", SITE_URL + "/blog/"),
        ("description", "Articles on Q/KDB+, performance and programming by Jonathan Kane."),
        ("language", "en"),
    ):
        ET.SubElement(channel, key).text = value
    ET.SubElement(channel, f"{{{atom}}}link", href=SITE_URL + "/feed.xml", rel="self", type="application/rss+xml")
    for post in posts:
        item = ET.SubElement(channel, "item")
        ET.SubElement(item, "title").text = post.title
        ET.SubElement(item, "link").text = SITE_URL + post.path
        ET.SubElement(item, "guid", isPermaLink="true").text = SITE_URL + post.path
        ET.SubElement(item, "description").text = post.description
        published = datetime.datetime.combine(post.published, datetime.time(), tzinfo=datetime.timezone.utc)
        ET.SubElement(item, "pubDate").text = format_datetime(published, usegmt=True)
    ET.indent(rss)
    ET.ElementTree(rss).write(OUT / "feed.xml", encoding="utf-8", xml_declaration=True)

    sitemap = ET.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    paths = {"/", *(f"/{page.name}/" for page in page_dirs())}
    paths.update(f"/blog/{book.parent.name}/" for book in books)
    paths.update(post.path for post in posts)
    for path in sorted(paths):
        ET.SubElement(ET.SubElement(sitemap, "url"), "loc").text = SITE_URL + path
    ET.indent(sitemap)
    ET.ElementTree(sitemap).write(OUT / "sitemap.xml", encoding="utf-8", xml_declaration=True)
    (OUT / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {SITE_URL}/sitemap.xml\n")

    # Feed-reader autodiscovery adds no visible changes to the pages.
    feed_link = '<link rel="alternate" type="application/rss+xml" title="Jonathan Kane — Articles" href="/feed.xml">'
    for page in OUT.rglob("*.html"):
        content = page.read_text()
        if "</head>" in content:
            page.write_text(content.replace("</head>", feed_link + "\n</head>", 1))
    print(f"  discovery  {len(posts)} feed entries, {len(paths)} sitemap URLs")


def main():
    try:
        import PIL  # noqa: F401
    except ImportError:
        sys.exit("error: Pillow is required for article image dimensions and previews (python3 -m pip install pillow)")
    books = {book: load_posts(book) for book in sorted((ROOT / "src/blog").glob("*/book.toml"))}
    posts = sorted((post for items in books.values() for post in items), key=lambda post: post.published, reverse=True)
    shutil.rmtree(OUT, ignore_errors=True)
    OUT.mkdir()
    print(f"Building site into {OUT.relative_to(ROOT)}/")
    build_pages()
    build_books(books)
    add_latest_posts(posts)
    write_discovery_files(books, posts)
    add_analytics()
    print("Done.")


if __name__ == "__main__":
    main()
