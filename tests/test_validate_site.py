import tempfile
import unittest
from pathlib import Path

from build import SITE_URL
from validate_site import validate


class SiteValidationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.page = self.root / 'index.html'
        self.write_page('<h1>Home</h1><p id="content">Hello</p>')
        (self.root / 'feed.xml').write_text(
            f'<rss version="2.0"><channel><item><link>{SITE_URL}/</link></item></channel></rss>'
        )
        (self.root / 'sitemap.xml').write_text(
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
            f'<url><loc>{SITE_URL}/</loc></url></urlset>'
        )

    def write_page(self, body):
        self.page.write_text('<html lang="en"><head><title>Home</title>'
                             '<meta name="description" content="Home"></head>'
                             f'<body><main>{body}</main></body></html>')

    def errors(self):
        return '\n'.join(validate(self.root)[0])

    def test_valid_local_links_queries_and_encoded_fragments(self):
        self.write_page('<h1>Home</h1><p id="a b">Hello</p>'
                        '<a href="/?v=123#a%20b">Content</a>'
                        '<a href="https://example.com/unavailable">External</a>'
                        '<a href="mailto:hello@example.com">Email</a>')
        self.assertEqual(self.errors(), '')

    def test_missing_assets_and_anchors_are_reported(self):
        self.write_page('<h1>Home</h1><img src="missing.png" alt="Example">'
                        '<a href="/#missing">Missing anchor</a>')
        errors = self.errors()
        self.assertIn('missing target: missing.png', errors)
        self.assertIn('missing anchor: /#missing', errors)

    def test_live_domain_links_are_checked_against_local_output(self):
        self.write_page(f'<h1>Home</h1><a href="{SITE_URL}/missing/">Missing</a>')
        self.assertIn('missing target:', self.errors())

    def test_structure_and_unexpanded_markers_are_reported(self):
        self.write_page('<h1>One</h1><h1>Two</h1><p id="same"></p><p id="same"></p>'
                        '<!-- @latest-posts --><img src="https://example.com/image.png">')
        errors = self.errors()
        for message in ('expected one primary heading', 'duplicate id', 'unexpanded build marker', 'missing alt'):
            self.assertIn(message, errors)

    def test_invalid_xml_and_missing_feed_targets_are_reported(self):
        (self.root / 'sitemap.xml').write_text('<invalid')
        (self.root / 'feed.xml').write_text(
            f'<rss><channel><item><link>{SITE_URL}/missing.html</link></item></channel></rss>'
        )
        errors = self.errors()
        self.assertIn('sitemap.xml:', errors)
        self.assertIn('feed.xml: missing target:', errors)

    def test_missing_build_and_links_outside_output_are_rejected(self):
        self.write_page('<h1>Home</h1><a href="../outside.html">Outside</a>')
        self.assertIn('link escapes site:', self.errors())
        self.page.unlink()
        self.assertIn('build the site first', self.errors())


if __name__ == '__main__':
    unittest.main()
