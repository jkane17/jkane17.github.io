"""Run with .venv/bin/python -m unittest discover -s tests."""
import json
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path
from unittest.mock import patch

import build


class ArticleMetadataTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.book = self.root / "q" / "book.toml"
        self.book.parent.mkdir()
        self.book.write_text("")
        (self.book.parent / "src").mkdir()

    def write_posts(self, rows):
        (self.book.parent / "posts.json").write_text(json.dumps(rows))

    def post(self, slug="example", date="Nov 17, 2026", **changes):
        (self.book.parent / "src" / f"{slug}.md").write_text("# Example\n")
        return dict(slug=slug, title="Q & C", date=date, description="Objects < values", **changes)

    def test_sorts_by_date_and_preserves_tie_order_and_display_date(self):
        self.write_posts([self.post("old", "Feb 04, 2026"), self.post("first"), self.post("second")])
        posts = build.load_posts(self.book)
        self.assertEqual([p.slug for p in posts], ["first", "second", "old"])
        self.assertEqual(posts[-1].date, "Feb 04, 2026")
        self.assertEqual(posts[-1].published.isoformat(), "2026-02-04")

    def test_rejects_invalid_metadata_and_missing_articles(self):
        row = self.post()
        invalid = [
            [], [row, row], [dict(row, date="Feb 30, 2026")],
            [dict(row, slug="../outside")], [dict(row, slug="print")],
            [dict(row, slug="missing")], [dict(row, title="")],
            [dict(row, description="two\nlines")], [dict(row, extra="unknown")],
            [dict(row, date=2026)],
        ]
        for rows in invalid:
            with self.subTest(rows=rows):
                self.write_posts(rows)
                with self.assertRaises(SystemExit):
                    build.load_posts(self.book)

    def test_missing_marker_fails_instead_of_silently_omitting_articles(self):
        self.write_posts([self.post()])
        for name in ("SUMMARY.md", "introduction.md"):
            (self.book.parent / "src" / name).write_text("No marker")
        with self.assertRaises(SystemExit):
            build.prepare_book_source(self.book.parent, build.load_posts(self.book))

    def test_feed_and_sitemap_use_metadata_and_escape_xml(self):
        self.write_posts([self.post()])
        posts = build.load_posts(self.book)
        out = self.root / "output"
        out.mkdir()
        (out / "index.html").write_text("<html><head></head><body></body></html>")
        with patch.object(build, "OUT", out), patch.object(build, "page_dirs", return_value=[]):
            build.write_discovery_files({self.book: posts}, posts)
        item = ET.parse(out / "feed.xml").find("channel/item")
        self.assertEqual(item.findtext("title"), "Q & C")
        self.assertEqual(item.findtext("description"), "Objects < values")
        self.assertEqual(item.findtext("pubDate"), "Tue, 17 Nov 2026 00:00:00 GMT")
        self.assertEqual(item.findtext("guid"), build.SITE_URL + "/blog/q/example.html")
        ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        urls = [node.text for node in ET.parse(out / "sitemap.xml").findall("s:url/s:loc", ns)]
        self.assertEqual(set(urls), {build.SITE_URL + path for path in ("/", "/blog/q/", "/blog/q/example.html")})
        self.assertIn('type="application/rss+xml"', (out / "index.html").read_text())


if __name__ == "__main__":
    unittest.main()
