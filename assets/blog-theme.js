// Run in the head before mdBook reads its saved theme, avoiding a theme flash.
// Leave mdBook's extra palettes available within the matching light/dark mode.
(() => {
    try {
        const theme = localStorage.getItem("theme");
        const bookTheme = localStorage.getItem("mdbook-theme");
        if (theme === "system") {
            localStorage.removeItem("mdbook-theme");
        } else if (theme === "light" && !["light", "rust"].includes(bookTheme)) {
            localStorage.setItem("mdbook-theme", "light");
        } else if (theme === "dark" && !["navy", "coal", "ayu"].includes(bookTheme)) {
            localStorage.setItem("mdbook-theme", "navy");
        }
    } catch {
        // mdBook can still use its system default if storage is unavailable.
    }
})();
