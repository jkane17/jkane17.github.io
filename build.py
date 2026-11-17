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
- Adds link-preview (Open Graph) tags to each blog post, using the post's title and
  description from the book's introduction.md table and its first image as the
  preview picture (rendered to a 1200x630 JPEG, since not all sites accept WebP).

Used by both the deploy workflow and local_test.sh.
"""

import datetime
import hashlib
import html
import re
import shutil
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit

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


def build_books():
    if shutil.which("mdbook") is None:
        sys.exit("error: mdbook is not installed (install it with: cargo install mdbook)")
    for book in sorted((ROOT / "src" / "blog").glob("*/book.toml")):
        name = book.parent.name
        result = subprocess.run(
            ["mdbook", "build", "-d", str(OUT / "blog" / name), str(book.parent)],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            sys.stderr.write(result.stdout + result.stderr)
            sys.exit(f"error: failed to build book '{name}'")
        print(f"  book  /blog/{name}/")
        add_book_navigation(OUT / "blog" / name)
        prepare_book_images(OUT / "blog" / name)
        add_post_previews(book.parent / "src", OUT / "blog" / name, f"{SITE_URL}/blog/{name}/")


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


# A row of the posts table in introduction.md:
# | **[Title](./post.md)** | Mar 9, 2026 | Description |
POST_ROW = re.compile(r"^\|\s*\*\*\[(.+?)\]\(\./([\w-]+)\.md\)\*\*\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$", re.MULTILINE)
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


def add_post_previews(book_src, book_out, book_url):
    intro = book_src / "introduction.md"
    if not intro.is_file():
        return
    for title, slug, date, description in POST_ROW.findall(intro.read_text()):
        page = book_out / f"{slug}.html"
        source = book_src / f"{slug}.md"
        if not page.is_file() or not source.is_file():
            sys.exit(f"error: {intro.relative_to(ROOT)} lists '{slug}' but the post was not found")

        image_url = None
        cover = FIRST_IMAGE.search(source.read_text())
        if cover:
            preview = book_out / "images" / f"{slug}.preview.jpg"
            render_preview_image(book_src / cover.group(1), preview)
            image_url = f"{book_url}images/{preview.name}"

        try:
            published = datetime.datetime.strptime(date.strip(), "%b %d, %Y").date().isoformat()
        except ValueError:
            published = None

        page_html = page.read_text()
        # Replace the book-wide description with the post's own, then add the preview tags
        page_html, n = re.subn(
            r'<meta name="description" content="[^"]*">',
            f'<meta name="description" content="{html.escape(description)}">\n        '
            + preview_tags(title, description, f"{book_url}{slug}.html", image_url, published),
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


class PostTableParser(HTMLParser):
    """Read rendered table text, including inline Markdown formatting/entities."""

    def __init__(self):
        super().__init__()
        self.posts = []
        self.cells = []
        self.cell = None
        self.href = None
        self.title = None
        self.in_link = False

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self.cells, self.href, self.title = [], None, None
        elif tag == "td":
            self.cell = ""
        elif tag == "a" and self.cell is not None and not self.cells:
            self.href = dict(attrs).get("href")
            self.title = ""
            self.in_link = True

    def handle_data(self, data):
        if self.cell is not None:
            self.cell += data
        if self.in_link:
            self.title += data

    def handle_endtag(self, tag):
        if tag == "a":
            self.in_link = False
        elif tag == "td" and self.cell is not None:
            self.cells.append(self.cell.strip())
            self.cell = None
        elif tag == "tr" and len(self.cells) >= 3 and self.href:
            self.posts.append((self.title.strip(), self.href, self.cells[1], self.cells[2]))


def add_latest_posts():
    """Render the latest three Q posts into the homepage and blog index."""
    parser = PostTableParser()
    parser.feed((OUT / "blog/q/introduction.html").read_text())
    posts = parser.posts
    if not posts:
        sys.exit("error: no posts found in /blog/q/introduction.html")
    try:
        posts = sorted(posts, key=lambda post: datetime.datetime.strptime(post[2], "%b %d, %Y"), reverse=True)
    except ValueError:
        # Preserve table order if a date cannot be parsed, as the browser did.
        pass

    cards = []
    for title, href, date, description in posts[:3]:
        href = urljoin("/blog/q/introduction.html", href)
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


def main():
    try:
        import PIL  # noqa: F401
    except ImportError:
        sys.exit("error: Pillow is required for article image dimensions and previews (python3 -m pip install pillow)")
    shutil.rmtree(OUT, ignore_errors=True)
    OUT.mkdir()
    print(f"Building site into {OUT.relative_to(ROOT)}/")
    build_pages()
    build_books()
    add_latest_posts()
    add_analytics()
    print("Done.")


if __name__ == "__main__":
    main()
