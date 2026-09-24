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
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

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
        lines = partial.read_text().rstrip("\n").split("\n")
        return "\n".join(indent + line if line else line for line in lines)

    return INCLUDE.sub(replace, html)


def mark_active_nav_link(html, url_path):
    # Nav links are written as class="nav-link" data-path="/section/" in partials/nav.html
    return html.replace(
        f'class="nav-link" data-path="{url_path}"',
        f'class="nav-link active" aria-current="page" data-path="{url_path}"',
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
        add_post_previews(book.parent / "src", OUT / "blog" / name, f"{SITE_URL}/blog/{name}/")


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
    try:
        import PIL  # noqa: F401
        have_pillow = True
    except ImportError:
        # Required in CI so deployed posts always get preview images
        if os.environ.get("CI"):
            sys.exit("error: Pillow is required to render blog preview images (pip install pillow)")
        print("  warning: Pillow not installed, skipping blog preview images (pip install pillow)")
        have_pillow = False

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
        if cover and have_pillow:
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


def main():
    shutil.rmtree(OUT, ignore_errors=True)
    OUT.mkdir()
    print(f"Building site into {OUT.relative_to(ROOT)}/")
    build_pages()
    build_books()
    print("Done.")


if __name__ == "__main__":
    main()
