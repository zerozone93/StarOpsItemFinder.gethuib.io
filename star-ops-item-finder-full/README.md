# Star Ops Item Finder

A React + TypeScript + Vite web app for Star Citizen mining, crafting, weapons, armor, locations, vendors, and a lightweight built-in assistant.

## Features
- Resources, mining, crafting, weapons, armor, and locations pages
- Detail pages for all major entity types
- Data loaded from `public/star-citizen-data.json`
- GitHub Pages-ready using Vite and HashRouter
- Local smart assistant panel powered by the JSON data

## Run locally
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Deploy to GitHub Pages
1. Create a repo named `star-ops-item-finder`
2. Push this project to `main`
3. In GitHub, enable Pages and choose **GitHub Actions** as the source
4. The included workflow at `.github/workflows/deploy.yml` will build and deploy automatically

## Data file
Main dataset:
- `public/star-citizen-data.json`

You can expand the file with more resources, armor, weapons, stores, blueprints, and recipes over time.

## Notes
- This starter uses a sample structured dataset and includes verification flags where data may change by patch.
- The assistant is local and template-based so it works on GitHub Pages without a backend.
