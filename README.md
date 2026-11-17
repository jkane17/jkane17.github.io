## TODO

- Resources page with descriptions and links to my repos etc.

## Building the Site

`build.py` builds the whole site into `_site/`. The deploy workflow and `local_test.sh` both use it.

- **Preview locally:** `./local_test.sh` builds the site, serves it at http://localhost:8000 and removes `_site/` on Ctrl+C. It automatically uses `.venv/bin/python` when available, otherwise `python3`. Requires `mdbook` and Pillow for article image dimensions and link-preview images. On a fresh checkout, set up the environment once with `python3 -m venv .venv` and `.venv/bin/python -m pip install pillow` (some Linux distributions also require the `python3-venv` package). No activation is needed when running the preview script.
- **Blog link previews:** each post gets its own preview tags automatically. The title and description come from the posts table in the book's `introduction.md`, and the image comes from the post's first image. A new post only needs its row in that table.
- **Article images:** the build reads local image dimensions and writes `width`/`height` into the generated HTML. The first image loads eagerly; later images use native lazy loading. The print page loads every image eagerly. The C-interface articles use an optimized WebP cover; the original JPEG is retained for existing external links.
- **Latest posts:** the build fills the homepage and blog index with the three newest articles from the rendered Q blog introduction table. The list works without JavaScript; rebuild after updating the table.
- **Blog navigation and themes:** the build adds Home and All articles icons to the top-right mdBook toolbar; their markup lives in `partials/blog-nav.html`. The main site's theme carries into articles before rendering: light uses Light, dark uses Navy, and system uses Auto. mdBook's Rust, Coal, and Ayu choices remain available; selecting a blog palette updates the corresponding site mode and preserves that palette on subsequent article visits.
- **Add a page:** create a top-level directory with an `index.html` (e.g. `projects/index.html`). It is published automatically.
- **QLib modules:** `/qlib/` refreshes its module cards from QLib's public README on each visit using `assets/qlib.js`. The HTML includes a fallback overview for offline use, fetch failures, or disabled JavaScript. The introductory description is maintained locally; the README remains the source for full details.
- **Quill downloads:** `assets/quill.js` refreshes `/quill/` from the public GitHub releases API, selecting the most recently published release including pre-releases. Buttons use that release's assets and licence. The HTML retains version-labelled fallback downloads if JavaScript or GitHub is unavailable; update these periodically. Platform labels are mapped in the script.
- **Quill screenshot:** `assets/quill-query.png` comes from `images/query_process.png` in the public `jkane17/quill-releases` repository. Keep the page overview and setup instructions aligned with that repository’s README.
- **Shared markup:** put it in `partials/` and include it with `<!-- @include partials/name.html -->` on its own line. The nav and footer work this way.
- **Nav links:** each link in `partials/nav.html` needs `class="nav-link" data-path="/section/"`. The build marks the current page's link as active.
- **Assets:** reference files as `/assets/...` in `src`/`href` attributes. The build appends a content hash (`?v=1a2b3c4d`) so browsers always fetch the current version after a deploy.

## Web Analytics

Cloudflare Web Analytics is configured for `jkane17.github.io` and starts tracking
once these changes are deployed. To replace the public site token:
In the [Cloudflare dashboard](https://dash.cloudflare.com/), open **Web Analytics**,
add `jkane17.github.io`, and copy the token from the JS snippet under **Manage site**.
Set `cloudflareAnalyticsToken` in `assets/analytics.js` to that token (not an API key),
then deploy the site using the existing workflow.

The build includes analytics on regular pages and generated blog pages. The script
only loads Cloudflare's beacon on `jkane17.github.io`, so local previews do not
record visits. If the site's hostname changes, update that check too. An empty
token disables tracking. Visit the published site after deployment, then check
the Cloudflare Web Analytics dashboard; data may take a few minutes to appear.

## Build Highlighing

Steps to build `highlight.js`:

1. Clone `highlight.js` project:

    ```bash
    git clone https://github.com/highlightjs/highlight.js.git
    cd highlight.js
    ```

2. Copy Q language file to `src/languages/`

    ```bash
    cp .../src/blog/theme/q.js ./src/languages/.
    ```

3. Install dependenies:

    ```bash
    npm install
    ```

4. Build with desired languages:

    ```
    node tools/build.js -t browser javascript python bash c q
    ```

5. Copy to project:
    ```bash
    cp ./build/highlight.min.js .../src/blog/theme/highlight.js
    ```
