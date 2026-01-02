#!/bin/bash

# Build
mkdir -p blog
for d in src/blog/*; do
    if [ -f "$d/book.toml" ]; then
        name=$(basename "$d")
        mdbook build -d "blog/$name" "$d"
    fi
done

# Serve
python3 -m http.server 8000
