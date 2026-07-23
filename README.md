# BiasharaSauti

BiasharaSauti is an AI business assistant for African SMEs. It turns WhatsApp chats and voice notes into orders, quotations, invoices, payments, and follow-ups.

## Architecture

- Frontend: static React app built with Vite and deployed to GitHub Pages
- Backend: Node API deployed to Google Cloud Run
- Database: Firestore Native in `us-central1`
- API base URL: configured in the frontend through `VITE_API_BASE_URL`
- Default backend URL: `https://biashara-sauti-api-840359086901.us-central1.run.app`

## What’s Included

- Marketing landing page with product positioning and calls to action
- Dashboard with revenue, orders, payments, and conversation analytics
- Shared inbox for customer messages
- AI assistant route for productivity prompts and voice transcription
- Self-service access flow with a `/register` route for new accounts
- Customers, orders, quotations, invoices, payments, products, analytics, automations, team, workflow, and settings screens

## Tech Stack

- React 19
- TypeScript
- Tailwind CSS 4
- TanStack Router
- TanStack Query
- Recharts
- Sonner
- OpenAI API for AI features, with Gemini fallback and business-query shortcuts in the backend

## Development

Requirements:

- Node.js 20+
- npm

Install and run the frontend locally:

```sh
npm install
npm run dev
```

Run the backend locally:

```sh
npm run start
```

Set the frontend API URL when the backend is running on another host:

```sh
VITE_API_BASE_URL=http://localhost:8080 npm run dev
```

If you want the frontend to use the Cloud Run backend locally, point the env var to the deployed URL:

```sh
VITE_API_BASE_URL=https://biashara-sauti-api-840359086901.us-central1.run.app npm run dev
```

## Scripts

- `npm run dev` - start the frontend development server
- `npm run build` - create the production frontend build in `dist/`
- `npm run preview` - preview the production frontend build
- `npm run start` - start the backend API server
- `npm run backend` - same as `npm run start`
- `npm run lint` - run ESLint
- `npm run format` - format the codebase with Prettier

## Deployment

### GitHub Pages frontend

Push to `main` to trigger the GitHub Actions workflow at `.github/workflows/deploy-pages.yml`.

Before the workflow runs, set `VITE_API_BASE_URL` in the Pages build environment if you need the frontend to point to a deployed backend.

The GitHub Pages site uses the `/openai-build-week/` base path.

### Google Cloud Run backend

Deploy the backend with Cloud Run source deploy:

```sh
gcloud run deploy biashara-sauti-api \
  --source . \
  --region us-central1 \
  --service-account biashara-sauti-api@openai-week-build.iam.gserviceaccount.com \
  --set-env-vars STORAGE_BACKEND=firestore \
  --allow-unauthenticated
```

Set `OPENAI_API_KEY` as a Cloud Run environment variable if you want live AI responses.
Set `GEMINI_API_KEY` as a fallback key if OpenAI is unavailable.
Set `SNIPPE_API_KEY` and `SNIPPE_WEBHOOK_SECRET` to enable live mobile-money payment links and webhook verification.

Configure Gemini and the Snippe webhook secret without exposing either value in
shell history:

```sh
bash scripts/configure-cloud-run-secrets.sh
```

## Structure

- `src/routes/` - file-based TanStack routes
- `src/components/` - shared UI and layout components
- `src/data/` - shared domain types
- `src/store/` - backend-hydrated workspace state
- `src/lib/` - shared utilities
- `backend.ts` - Cloud Run entrypoint
