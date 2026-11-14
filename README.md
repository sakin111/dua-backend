# Dua & Ruqyah API

A Node.js and Express API for browsing dua categories, subcategories, duas, and ruqyah articles. Content is imported from `src/app/db/duaruqyah_content.json` into libSQL (Turso) or a local SQLite database.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`. The default `file:local.db` URL uses a local SQLite file. For Turso, set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.
3. Seed the database and start the development server:

   ```sh
   npm run seed
   npm run dev
   ```

The API listens on port `4000` by default. The seed command can be run again to update imported content. Verify the content's accuracy and reuse rights before publishing it.

### Environment variables

| Variable | Purpose | Local example |
| --- | --- | --- |
| `PORT` | Server port | `4000` |
| `TURSO_DATABASE_URL` | Turso URL or local SQLite URL | `file:local.db` |
| `TURSO_AUTH_TOKEN` | Authentication token for a remote Turso database | Not required locally |
| `FRONTEND_URL` | Allowed frontend origin for CORS | `http://localhost:3000` |

Do not commit `.env`, database files, or secrets to GitHub.

## API

All responses use this format:

```json
{
  "success": true,
  "message": "Categories retrieved successfully",
  "data": []
}
```

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/` | Health check |
| `GET` | `/api/categories` | List categories |
| `GET` | `/api/categories/:catId/subcategories` | List a category's subcategories |
| `GET` | `/api/categories/:catId/duas` | List duas in a category |
| `GET` | `/api/subcategories/:subId/duas` | List duas in a subcategory |

Example: `GET /api/categories/1/duas`

Invalid numeric parameters return `400`; valid IDs with no matching records return `404`. Error responses use the same envelope with `success: false` and `data: null`.

## Deploy to Render

Create a **Web Service** connected to the GitHub repository, then set:

- **Build command:** `npm install && npm run build`
- **Start command:** `node dist/app/db/seed.js && npm start`
- **Environment variable:** `TURSO_DATABASE_URL` to your Turso database URL
- **Environment variable:** `TURSO_AUTH_TOKEN` to your Turso auth token
- **Environment variable:** `FRONTEND_URL=https://your-frontend-domain`

Render supplies `PORT` automatically. The start command imports content into Turso before starting the API. The import is safe to rerun when the service restarts.
