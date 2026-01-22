// Load footer component
document.addEventListener("DOMContentLoaded", function () {
    fetch("/assets/footer.html")
        .then((response) => response.text())
        .then((html) => {
            const footerComponent = document.querySelector("footer-component");
            if (footerComponent) {
                footerComponent.innerHTML = html;
                // Set current year in footer
                const yearElement = document.getElementById("year");
                if (yearElement) {
                    yearElement.textContent = new Date().getFullYear();
                }
            }
        })
        .catch((error) => console.error("Error loading footer:", error));
});
