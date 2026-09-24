// The nav is built into each page by build.py (see partials/nav.html),
// including the active link, so only its behaviour is set up here.
// This script is deferred, so the DOM is ready when it runs.
initHamburgerMenu();
ThemeManager.bindButtons();

// Hamburger menu functionality
function initHamburgerMenu() {
    const hamburgerMenu = document.getElementById("hamburgerMenu");
    const navLinks = document.getElementById("navLinks");

    if (!hamburgerMenu || !navLinks) return;

    const isOpen = () => hamburgerMenu.getAttribute("aria-expanded") === "true";

    function setMenuOpen(open) {
        hamburgerMenu.classList.toggle("active", open);
        navLinks.classList.toggle("active", open);
        hamburgerMenu.setAttribute("aria-expanded", String(open));
    }

    hamburgerMenu.addEventListener("click", () => setMenuOpen(!isOpen()));

    // Close menu when a link is clicked (a no-op on desktop, where it's never open)
    navLinks.querySelectorAll(".nav-link").forEach((link) => {
        link.addEventListener("click", () => setMenuOpen(false));
    });

    // Close menu on Escape and return focus to the toggle button
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && isOpen()) {
            setMenuOpen(false);
            hamburgerMenu.focus();
        }
    });
}
