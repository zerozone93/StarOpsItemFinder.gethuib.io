# Star Ops Backend

A full TypeScript backend API for the Star Ops Item Finder app.

## Stack

- Fastify
- TypeScript
- Prisma ORM
- PostgreSQL
- Zod validation
- JWT admin auth
- Swagger docs

## What it includes

- Public read APIs for resources, locations, mining methods, tools, vehicles, vendors, loot sources, weapons, armor, blueprints, and recipes
- Global search endpoint
- Local retrieval-based assistant endpoint
- Admin login with JWT
- Admin CRUD endpoints for core entities
- Prisma schema for a normalized relational data model
- Seed script
- JSON import script for your app dataset

## Quick start

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

Server defaults to `http://localhost:4000`.
Swagger UI is available at `/docs`.

## Environment variables

See `.env.example`.

Most important values:

- `DATABASE_URL`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `CORS_ORIGIN`

## Core endpoints

### Health

- `GET /api/health`

### Public catalog

- `GET /api/resources`
- `GET /api/resources/:idOrSlug`
- `GET /api/locations`
- `GET /api/locations/:idOrSlug`
- `GET /api/miningMethods`
- `GET /api/tools`
- `GET /api/vehicles`
- `GET /api/vendors`
- `GET /api/lootSources`
- `GET /api/weapons`
- `GET /api/armor`
- `GET /api/blueprints`
- `GET /api/recipes`

### Search

- `GET /api/search?q=hadanite`

### Assistant

- `POST /api/assistant`

Request body:

```json
{
  "question": "Where do I find Hadanite?"
}
```

### Admin auth

- `POST /api/auth/login`

Request body:

```json
{
  "email": "admin@example.com",
  "password": "change-me-now"
}
```

### Admin write routes

Requires `Authorization: Bearer <token>`.

- `POST /api/admin/resources`
- `POST /api/admin/weapons`
- `POST /api/admin/armor`
- `POST /api/admin/vendors`
- `PATCH /api/admin/resources/:id`
- `PATCH /api/admin/weapons/:id`
- `PATCH /api/admin/armor/:id`
- `PATCH /api/admin/vendors/:id`
- `DELETE /api/admin/resources/:id`
- `DELETE /api/admin/weapons/:id`
- `DELETE /api/admin/armor/:id`
- `DELETE /api/admin/vendors/:id`

## Importing your Star Citizen JSON

You can import your existing dataset into PostgreSQL.

Example:

```bash
npm run import:json -- ../star-ops-master-data.json
```

If no path is supplied, the script defaults to `../star-ops-master-data.json` relative to the backend folder.

## Seed data

The seed script creates:

- one admin user
- starter system and locations
- starter mining method and vehicle
- starter resource
- starter vendor and weapon

This is only development seed data.

## Assistant behavior

The assistant endpoint currently works without a paid AI model.
It uses:

- search
- relationship traversal
- answer templates
- confidence and verification status

It is structured so you can later replace or extend it with a real LLM-backed provider.

## Suggested deployment

- Database: Supabase, Railway Postgres, Neon, or Render Postgres
- API server: Railway, Render, Fly.io, or another Node host

## GitHub-ready notes

This folder is already laid out as a backend repo.
You can push it directly to GitHub as its own repository or as `/backend` inside your main app repo.

## Next recommended upgrades

- more admin CRUD coverage for all entity types
- richer filtering in public endpoints
- OpenAI-backed assistant provider
- audit logging for admin writes
- role-based auth
- conflict and verification workflow tables
