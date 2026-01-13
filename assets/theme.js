/**
 * Theme Management Module
 * Handles theme switching between light, dark, and system preferences
 */
const ThemeManager = {
  STORAGE_KEY: 'theme',
  DARK_CLASS: 'dark-theme',
  THEMES: {
    LIGHT: 'light',
    DARK: 'dark',
    SYSTEM: 'system'
  },

  /**
   * Initialize theme from localStorage or system preference
   */
  init() {
    const saved = localStorage.getItem(this.STORAGE_KEY) || this.THEMES.SYSTEM;
    this.applyTheme(saved);
    this.setupListeners();
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
    
    localStorage.setItem(this.STORAGE_KEY, theme);
    this.updateButtons(theme);
  },

  /**
   * Apply system preference theme
   */
  applySystemTheme() {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
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
    document.querySelectorAll('.theme-button').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.theme === theme) {
        btn.classList.add('active');
      }
    });
  },

  /**
   * Setup event listeners for theme buttons and system changes
   */
  setupListeners() {
    // Theme button clicks
    document.querySelectorAll('.theme-button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const theme = e.target.dataset.theme;
        this.applyTheme(theme);
      });
    });

    // System preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const saved = localStorage.getItem(this.STORAGE_KEY) || this.THEMES.SYSTEM;
      if (saved === this.THEMES.SYSTEM) {
        this.applySystemTheme();
      }
    });
  }
};

// Initialize when DOM is ready
if (document.readyState !== 'loading') {
  ThemeManager.init();
} else {
  document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
}
