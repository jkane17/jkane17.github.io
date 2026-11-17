// mdBook applies its own theme and syntax colours. Share the chosen mode with
// the main site without replacing mdBook's palette picker or system listener.
document.getElementById("mdbook-theme-list")?.addEventListener("click", (event) => {
    const button = event.target.closest("button.theme");
    if (!button) return;
    const palette = button.id.replace(/^mdbook-theme-/, "");
    const modes = {
        default_theme: "system",
        light: "light",
        rust: "light",
        navy: "dark",
        coal: "dark",
        ayu: "dark",
    };
    if (!modes[palette]) return;
    try {
        localStorage.setItem("theme", modes[palette]);
    } catch {
        // Theme selection within this article still works without persistence.
    }
});
