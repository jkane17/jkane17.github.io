#!/bin/bash

# Run from the repo root so relative paths work wherever the script is invoked from
cd "$(dirname "$0")" || exit 1

# Color output
readonly GREEN='\033[0;32m'
readonly BLUE='\033[0;34m'
readonly RED='\033[0;31m'
readonly NC='\033[0m'  # No Color

# Cleanup function to remove the built site
cleanup() {
    echo -e "\n${BLUE}Cleaning up built site...${NC}"
    rm -rf _site
    echo -e "${GREEN}✓ Cleanup complete${NC}"
    exit 0
}

# Trap signals for cleanup
trap cleanup SIGINT SIGTERM

# Build the site exactly as the deploy workflow does
echo -e "${BLUE}Building site...${NC}"
if ! python3 build.py; then
    echo -e "\n${RED}✗ Build failed${NC}" >&2
    exit 1
fi
echo -e "${GREEN}✓ Build complete${NC}"

# Serve
echo -e "${BLUE}Starting local server at http://localhost:8000${NC}"
echo -e "${BLUE}Press Ctrl+C to stop and clean up${NC}\n"
# Like `python3 -m http.server`, but tells the browser to re-check every file so a
# rebuilt page is never shown with stale cached scripts or styles
python3 - <<'EOF'
import functools
import http.server


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


http.server.test(HandlerClass=functools.partial(NoCacheHandler, directory="_site"), port=8000)
EOF
