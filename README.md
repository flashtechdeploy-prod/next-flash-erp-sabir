# Flash ERP - Dockploy Deployment Guide

This repository contains two apps:
- Backend (NestJS): `flash-backend-nestjs`
- Frontend (Next.js): `flash-frontend-next-antd`

Both are configured for Nixpacks builds and Dockploy deployment.

## Backend (NestJS)
- Build: `npm run build`
- Start: `npm run start:prod` (uses `process.env.PORT` or defaults to 8000)

### Required environment variables
- `DATABASE_URL`: Postgres connection string (e.g. `postgres://user:pass@host:5432/db?sslmode=require`)
- `JWT_SECRET`: secret for auth tokens
- `CORS_ORIGINS`: comma-separated allowed origins (e.g. `https://your-frontend.example`)

### Optional (Cloud storage via Backblaze B2 S3)
- `B2_KEY_ID`
- `B2_APPLICATION_KEY`
- `B2_BUCKET_NAME`
- `B2_ENDPOINT` (e.g. `https://s3.us-west-002.backblazeb2.com`)

Notes:
- Local `uploads/` directories are auto-initialized; prefer cloud storage in production.
- The app listens on `PORT` provided by Dockploy/Nixpacks.

## Frontend (Next.js)
- Build: `npm run build`
- Start: `npm run start` (binds to `$PORT`)

### Required environment variables
- `NEXT_PUBLIC_API_URL`: Base URL for the backend (e.g. `https://your-backend.example`)

## Dockploy Setup
1. Create two services from this repo:
   - Service A: `flash-backend-nestjs`
   - Service B: `flash-frontend-next-antd`
2. Dockploy should detect Nixpacks for each service.
3. Set the relevant environment variables for each service (above).
4. Deploy. Ensure the frontend `NEXT_PUBLIC_API_URL` points to the backend URL.

## Repo Hygiene
- Root `.gitignore` excludes build outputs, env files, logs, local uploads, and `sqlite.db`.
- Docker files were removed; deployment is via Nixpacks/Dockploy.

## Troubleshooting
- Backend not reachable: verify `DATABASE_URL`, `PORT`, and `CORS_ORIGINS`.
- Frontend API errors: ensure `NEXT_PUBLIC_API_URL` matches the backend public URL.
- Storage errors: set B2 variables or disable cloud features if not used.