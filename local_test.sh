#!/bin/bash

# Color output
readonly GREEN='\033[0;32m'
readonly BLUE='\033[0;34m'
readonly RED='\033[0;31m'
readonly NC='\033[0m'  # No Color

# Array of blog directories to build
declare -a BLOGS=()

# Cleanup function to remove built sites
cleanup() {
    echo -e "\n${BLUE}Cleaning up built sites...${NC}"
    rm -rf blog/*/
    echo -e "${GREEN}✓ Cleanup complete${NC}"
    exit 0
}

# Trap signals for cleanup
trap cleanup SIGINT SIGTERM

# Check if mdbook is installed
if ! command -v mdbook &> /dev/null; then
    echo -e "${RED}Error: mdbook is not installed${NC}"
    echo "Install it with: cargo install mdbook"
    exit 1
fi

# Find all mdbook projects
echo -e "${BLUE}Discovering mdbooks...${NC}"
for d in src/blog/*/; do
    if [ -f "$d/book.toml" ]; then
        BLOGS+=("$d")
    fi
done

if [ ${#BLOGS[@]} -eq 0 ]; then
    echo -e "${BLUE}No mdbooks found in src/blog/${NC}"
    exit 0
fi

# Build all blogs
echo -e "${BLUE}Building ${#BLOGS[@]} mdbooks...${NC}"
mkdir -p blog

build_count=0
failed_books=()

for blog_dir in "${BLOGS[@]}"; do
    name=$(basename "$blog_dir")
    echo -e "${BLUE}Building $name...${NC}"
    
    if mdbook build -d "blog/$name" "$blog_dir" 2>&1 | grep -v "^warning:"; then
        echo -e "${GREEN}✓ Built $name${NC}"
        ((build_count++))
    else
        echo -e "${RED}✗ Failed to build $name${NC}"
        failed_books+=("$name")
    fi
done

if [ ${#failed_books[@]} -gt 0 ]; then
    echo -e "\n${RED}✗ Build failed for: ${failed_books[*]}${NC}" >&2
    exit 1
fi

echo -e "${GREEN}✓ Build complete! ($build_count of ${#BLOGS[@]} built)${NC}"

# Serve
echo -e "${BLUE}Starting local server at http://localhost:8000${NC}"
echo -e "${BLUE}Press Ctrl+C to stop and clean up${NC}\n"
cd "$(dirname "$0")"
python3 -m http.server 8000 --directory .
