# Star Ops Item Finder

A community-made Star Citizen item database and guide for the Stanton system.

🌐 **Live site:** https://[your-username].github.io/StarOpsItemFinder.gethuib.io/

## Features

- 🔍 **Search** across resources, weapons, armor, and locations
- ⛏️ **Mining Guide** — FPS, ROC, and Ship mining methods, tools, and best spots
- 💎 **Resources** — All mineable resources with locations and values
- 🔫 **Weapons** — Full weapon database with vendors and stats
- 🛡️ **Armor** — Complete armor catalog with purchase locations
- 🪐 **Locations** — Planets, moons, stations, and cities with details
- 🧪 **Crafting** — Recipes and blueprints (upcoming in-game feature)
- 🤖 **AI Assistant** — Local smart assistant with fuzzy search and intent detection

## Tech Stack

- React 19 + TypeScript + Vite
- React Router (HashRouter for GitHub Pages)
- CSS Modules (dark sci-fi theme)
- Static JSON data (`public/star-citizen-data.json`)
- GitHub Actions for automatic deployment

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deployment

Automatically deployed to GitHub Pages via GitHub Actions on push to `main`.

## Data

All data is stored in `public/star-citizen-data.json`. The data covers:
- 8+ mineable resources
- 20+ locations (planets, moons, stations, cities)
- 3 mining methods (FPS, ROC, Ship)
- 4 mining tools/vehicles
- 7 weapons
- 8 armor pieces
- 9 vendors
- 3 loot source types

> **Disclaimer:** Not affiliated with Cloud Imperium Games. Star Citizen® is a registered trademark of Cloud Imperium Games Corp. All data is community-sourced.
