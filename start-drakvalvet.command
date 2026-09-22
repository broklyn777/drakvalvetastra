#!/bin/sh
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js saknas. Installera Node.js 24 från https://nodejs.org/"
  printf "Tryck Enter för att stänga …"
  read -r _
  exit 1
fi
npm run open
