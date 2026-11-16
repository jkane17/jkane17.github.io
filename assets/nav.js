// Opening and closing the mobile menu is handled natively by <details>.
// JavaScript adds Escape-to-close and closes the menu after selecting a link.
const mobileNav = document.getElementById("mobileNav");
const hamburgerMenu = document.getElementById("hamburgerMenu");

if (mobileNav && hamburgerMenu) {
    mobileNav.querySelectorAll(".nav-link").forEach((link) => {
        link.addEventListener("click", () => { mobileNav.open = false; });
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && mobileNav.open) {
            mobileNav.open = false;
            hamburgerMenu.focus();
        }
    });

    // Return to a closed mobile menu after changing between layout sizes.
    window.matchMedia("(max-width: 768px)").addEventListener("change", () => {
        mobileNav.open = false;
    });
}

ThemeManager.bindButtons();
