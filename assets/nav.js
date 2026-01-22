// Load navigation component
document.addEventListener("DOMContentLoaded", function () {
    fetch("/assets/nav.html")
        .then((response) => response.text())
        .then((html) => {
            const navComponent = document.querySelector("nav-component");
            if (navComponent) {
                navComponent.innerHTML = html;

                // Set active nav link based on current path
                const currentPath = window.location.pathname;
                const navLinks = document.querySelectorAll(".nav-link");
                navLinks.forEach((link) => {
                    link.classList.remove("active");
                    if (
                        link.getAttribute("data-path") === currentPath ||
                        (currentPath === "/" && link.getAttribute("data-path") === "/")
                    ) {
                        link.classList.add("active");
                    }
                });

                // Initialize hamburger menu
                initHamburgerMenu();

                // Initialize theme switcher
                initThemeSwitcher();
            }
        })
        .catch((error) => console.error("Error loading navigation:", error));
});

// Hamburger menu functionality
function initHamburgerMenu() {
    const hamburgerMenu = document.getElementById("hamburgerMenu");
    const navLinks = document.getElementById("navLinks");

    if (hamburgerMenu && navLinks) {
        function toggleMenu() {
            hamburgerMenu.classList.toggle("active");
            navLinks.classList.toggle("active");
        }

        hamburgerMenu.addEventListener("click", toggleMenu);

        // Close menu when a link is clicked
        navLinks.querySelectorAll(".nav-link").forEach((link) => {
            link.addEventListener("click", toggleMenu);
        });
    }
}

// Theme switcher functionality
function initThemeSwitcher() {
    const themeSwitcher = document.getElementById("themeSwitcher");
    const themeButtons = document.querySelectorAll(".theme-button");

    if (!themeSwitcher || themeButtons.length === 0) return;

    function initTheme() {
        const saved = localStorage.getItem("theme") || "system";
        const html = document.documentElement;

        if (saved === "dark") {
            html.classList.add("dark-theme");
        } else if (saved === "light") {
            html.classList.remove("dark-theme");
        } else if (saved === "system") {
            if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
                html.classList.add("dark-theme");
            } else {
                html.classList.remove("dark-theme");
            }
        }

        updateActiveButton(saved);
    }

    function updateActiveButton(theme) {
        themeButtons.forEach((btn) => {
            btn.classList.remove("active");
            if (btn.dataset.theme === theme) {
                btn.classList.add("active");
            }
        });
    }

    themeButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const theme = btn.dataset.theme;
            const html = document.documentElement;

            if (theme === "dark") {
                html.classList.add("dark-theme");
            } else if (theme === "light") {
                html.classList.remove("dark-theme");
            } else if (theme === "system") {
                if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
                    html.classList.add("dark-theme");
                } else {
                    html.classList.remove("dark-theme");
                }
            }

            localStorage.setItem("theme", theme);
            updateActiveButton(theme);
        });
    });

    // Initialize theme on page load
    initTheme();

    // Listen for system theme changes
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
        const saved = localStorage.getItem("theme") || "system";
        if (saved === "system") {
            const html = document.documentElement;
            if (e.matches) {
                html.classList.add("dark-theme");
            } else {
                html.classList.remove("dark-theme");
            }
        }
    });
}
