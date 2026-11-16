// Public Web Analytics token from Cloudflare's Manage site snippet (not an API key).
const cloudflareAnalyticsToken = "0f13fe25df604ff89a695b76c7303cf3";

// Only track the published website, not local previews or other copies.
if (window.location.hostname === "jkane17.github.io" && cloudflareAnalyticsToken) {
    const beacon = document.createElement("script");
    beacon.type = "module";
    beacon.src = "https://static.cloudflareinsights.com/beacon.min.js";
    beacon.setAttribute("data-cf-beacon", JSON.stringify({ token: cloudflareAnalyticsToken }));
    document.head.appendChild(beacon);
}
