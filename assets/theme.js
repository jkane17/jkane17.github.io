/**
 * Theme Management Module
 * Handles theme switching between light, dark, and system preferences
 */
const ThemeManager = {
    STORAGE_KEY: "theme",
    DARK_CLASS: "dark-theme",
    THEMES: {
        LIGHT: "light",
        DARK: "dark",
        SYSTEM: "system",
    },

    /**
     * Get the saved theme, falling back to system if storage is unavailable
     */
    getSaved() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) || this.THEMES.SYSTEM;
        } catch (e) {
            return this.THEMES.SYSTEM;
        }
    },

    /**
     * Apply theme to the document
     */
    applyTheme(theme) {
        const html = document.documentElement;

        switch (theme) {
            case this.THEMES.DARK:
                html.classList.add(this.DARK_CLASS);
                break;
            case this.THEMES.LIGHT:
                html.classList.remove(this.DARK_CLASS);
                break;
            case this.THEMES.SYSTEM:
            default:
                this.applySystemTheme();
                break;
        }

        try {
            localStorage.setItem(this.STORAGE_KEY, theme);
        } catch (e) {}
        this.updateButtons(theme);
    },

    /**
     * Apply system preference theme
     */
    applySystemTheme() {
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const html = document.documentElement;

        if (isDark) {
            html.classList.add(this.DARK_CLASS);
        } else {
            html.classList.remove(this.DARK_CLASS);
        }
    },

    /**
     * Update active button state
     */
    updateButtons(theme) {
        document.querySelectorAll(".theme-button").forEach((btn) => {
            const isActive = btn.dataset.theme === theme;
            btn.classList.toggle("active", isActive);
            btn.setAttribute("aria-pressed", String(isActive));
        });
    },

    /**
     * Attach click handlers to the theme buttons and mark the active one.
     * Called by nav.js once the page (which contains the buttons) has loaded.
     */
    bindButtons() {
        document.querySelectorAll(".theme-button").forEach((btn) => {
            btn.addEventListener("click", () => this.applyTheme(btn.dataset.theme));
        });
        this.updateButtons(this.getSaved());
    },

    /**
     * Follow system preference changes while the theme is set to system
     */
    watchSystemTheme() {
        window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
            if (this.getSaved() === this.THEMES.SYSTEM) {
                this.applySystemTheme();
            }
        });
    },
};

// Apply the saved theme immediately. This script is loaded without defer in <head>
// so the theme is set before first paint, avoiding a flash of the wrong theme.
ThemeManager.applyTheme(ThemeManager.getSaved());
ThemeManager.watchSystemTheme();
