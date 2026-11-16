// Keep a usable, indexed overview in the HTML; refresh it from the public README.
async function refreshQLibModules() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
        const response = await fetch("https://raw.githubusercontent.com/jkane17/qlib/main/README.md", {
            signal: controller.signal,
        });
        if (!response.ok) throw new Error("README unavailable");
        const readme = await response.text();
        const section = readme.match(/^## Modules\s*\n([\s\S]*?)(?=^## |$(?![\s\S]))/m);
        if (!section) throw new Error("Modules section missing");
        const modules = section[1].split("\n").flatMap((line) => {
            const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
            const name = cells[0]?.match(/^`([\w-]+)`$/)?.[1];
            return name && cells[1] ? [{ name, description: cells[1] }] : [];
        });
        if (!modules.length) throw new Error("Module table missing");

        const cards = modules.map(({ name, description }) => {
            const card = document.createElement("article");
            card.className = "card qlib-card";
            const heading = document.createElement("h3");
            heading.textContent = name;
            const summary = document.createElement("p");
            summary.textContent = description;
            const link = document.createElement("a");
            link.className = "card-link";
            link.href = `https://github.com/jkane17/qlib/blob/main/src/q/${encodeURIComponent(name)}.q`;
            link.textContent = "View source →";
            card.append(heading, summary, link);
            return card;
        });
        document.getElementById("qlib-modules").replaceChildren(...cards);
    } catch {
        // The static overview and README link remain available offline or on errors.
    } finally {
        clearTimeout(timeout);
    }
}

refreshQLibModules();
