## TODO

- Resources page with descriptions and links to my repos etc.

## Building the Site

`build.py` builds the whole site into `_site/`. The deploy workflow and `local_test.sh` both use it.

- **Preview locally:** `./local_test.sh` builds the site, serves it at http://localhost:8000 and removes `_site/` on Ctrl+C. Requires `mdbook` and, for blog preview images, Pillow (`pip install pillow`).
- **Blog link previews:** each post gets its own preview tags automatically. The title and description come from the posts table in the book's `introduction.md`, and the image comes from the post's first image. A new post only needs its row in that table.
- **Add a page:** create a top-level directory with an `index.html` (e.g. `projects/index.html`). It is published automatically.
- **QLib modules:** `/qlib/` refreshes its module cards from QLib's public README on each visit using `assets/qlib.js`. The HTML includes a fallback overview for offline use, fetch failures, or disabled JavaScript. The introductory description is maintained locally; the README remains the source for full details.
- **Quill downloads:** `assets/quill.js` refreshes `/quill/` from the public GitHub releases API, selecting the most recently published release including pre-releases. Buttons use that release's assets and licence. The HTML retains version-labelled fallback downloads if JavaScript or GitHub is unavailable; update these periodically. Platform labels are mapped in the script.
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
