// GitHub's /latest endpoint excludes betas, so select by publication date.
async function refreshQuillDownloads() {
    const repo = "https://github.com/jkane17/quill-releases";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const platforms = [
        ["x86_64-unknown-linux-musl", "Linux x86-64"],
        ["aarch64-unknown-linux-musl", "Linux ARM64"],
        ["aarch64-apple-darwin", "macOS Apple Silicon"],
        ["x86_64-apple-darwin", "macOS Intel"],
        ["x86_64-pc-windows-msvc", "Windows x86-64"],
        ["aarch64-pc-windows-msvc", "Windows ARM64"],
    ];
    try {
        const response = await fetch("https://api.github.com/repos/jkane17/quill-releases/releases?per_page=100", {
            signal: controller.signal,
            headers: { Accept: "application/vnd.github+json" },
        });
        if (!response.ok) throw new Error("Releases unavailable");
        const releases = await response.json();
        const release = releases.filter((item) => !item.draft && item.published_at)
            .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at))[0];
        if (!release || !release.html_url.startsWith(`${repo}/releases/tag/`)) {
            throw new Error("No published release");
        }
        const assets = release.assets.filter((asset) =>
            asset.state === "uploaded" && asset.browser_download_url.startsWith(`${repo}/releases/download/`));
        const buttons = platforms.flatMap(([target, label]) => {
            const asset = assets.find((item) => item.name.startsWith("quill-") &&
                (item.name.endsWith(`-${target}.tar.gz`) || item.name.endsWith(`-${target}.zip`)));
            if (!asset) return [];
            const link = document.createElement("a");
            link.className = "cta-button";
            link.href = asset.browser_download_url;
            link.textContent = `Download for ${label}`;
            return [link];
        });
        if (!buttons.length) throw new Error("No supported downloads");
        document.getElementById("quill-download-buttons").replaceChildren(...buttons);
        const licence = assets.find((asset) => /^licen[cs]e(?:\.txt|\.md)?$/i.test(asset.name));
        const licenceLink = document.getElementById("quill-licence-download");
        licenceLink.href = licence ? licence.browser_download_url : `${repo}/blob/main/LICENSE`;
        licenceLink.textContent = licence ? "Download licence" : "Read the licence";
        document.getElementById("quill-release-notes").href = release.html_url;
        document.getElementById("quill-release-status").textContent =
            `Latest release: ${release.tag_name}${release.prerelease ? " (pre-release)" : ""}.`;
    } catch {
        document.getElementById("quill-release-status").textContent =
            "Downloads for v0.1.0-beta.3 (pre-release). Unable to check for updates; see All releases for the latest version.";
    } finally {
        clearTimeout(timeout);
    }
}

refreshQuillDownloads();
