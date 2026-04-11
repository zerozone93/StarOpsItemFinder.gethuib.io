# Star Ops Backend

Node.js + TypeScript + Express + Prisma backend.

## Quick Start
```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev
```

## API Endpoints
- GET /api/resources, /api/weapons, /api/armor, /api/vendors, /api/locations, /api/recipes
- GET /api/search?q=
- POST /api/assistant
- POST /api/admin/auth/login (returns JWT)
- POST/PATCH/DELETE /api/admin/{resources,weapons,armor,locations,vendors}/:id (auth required)
- POST /api/import/json (auth required)
