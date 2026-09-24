// Click-to-load YouTube videos.
// Each .video-facade is a plain link to the video on YouTube showing its thumbnail,
// so nothing from the YouTube player loads until someone asks to watch. Without JS
// the link simply opens YouTube. With JS, a click swaps in the embedded player.
// This script is deferred, so the DOM is ready when it runs.
document.querySelectorAll(".video-facade").forEach((facade) => {
    // It now plays in place rather than navigating, so announce it as a button
    facade.setAttribute("role", "button");

    function loadPlayer() {
        const iframe = document.createElement("iframe");
        iframe.src = `https://www.youtube-nocookie.com/embed/${facade.dataset.videoId}?autoplay=1`;
        iframe.title = facade.dataset.title;
        iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = "strict-origin-when-cross-origin";
        facade.replaceWith(iframe);
        iframe.focus();
    }

    facade.addEventListener("click", (e) => {
        // Let ctrl/cmd/shift/middle-click open YouTube as a normal link would
        if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        loadPlayer();
    });

    // Buttons activate on Space as well as Enter (links only handle Enter)
    facade.addEventListener("keydown", (e) => {
        if (e.key === " ") {
            e.preventDefault();
            loadPlayer();
        }
    });
});
