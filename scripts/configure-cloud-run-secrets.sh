#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-openai-week-build}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-biashara-sauti-api}"

gcloud services enable secretmanager.googleapis.com --project "$PROJECT_ID"

service_account="$(gcloud run services describe "$SERVICE" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --format='value(spec.template.spec.serviceAccountName)')"

if [[ -z "$service_account" ]]; then
  project_number="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
  service_account="${project_number}-compute@developer.gserviceaccount.com"
fi

upsert_secret() {
  local secret_name="$1"
  local secret_value="$2"

  if gcloud secrets describe "$secret_name" --project "$PROJECT_ID" >/dev/null 2>&1; then
    printf '%s' "$secret_value" | gcloud secrets versions add "$secret_name" \
      --project "$PROJECT_ID" \
      --data-file=-
  else
    printf '%s' "$secret_value" | gcloud secrets create "$secret_name" \
      --project "$PROJECT_ID" \
      --replication-policy=automatic \
      --data-file=-
  fi

  gcloud secrets add-iam-policy-binding "$secret_name" \
    --project "$PROJECT_ID" \
    --member "serviceAccount:${service_account}" \
    --role roles/secretmanager.secretAccessor >/dev/null
}

read -r -s -p "Gemini API key: " gemini_key
printf '\n'
read -r -s -p "Snippe webhook secret: " snippe_webhook_secret
printf '\n'

if [[ -z "$gemini_key" || -z "$snippe_webhook_secret" ]]; then
  echo "Both Gemini API key and Snippe webhook secret are required." >&2
  exit 1
fi

upsert_secret "biasharasauti-gemini-api-key" "$gemini_key"
upsert_secret "biasharasauti-snippe-webhook-secret" "$snippe_webhook_secret"

gcloud run services update "$SERVICE" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --update-secrets "GEMINI_API_KEY=biasharasauti-gemini-api-key:latest,SNIPPE_WEBHOOK_SECRET=biasharasauti-snippe-webhook-secret:latest" \
  --update-env-vars "ALLOWED_ORIGINS=https://mr-mpange.github.io,FRONTEND_BASE_URL=https://mr-mpange.github.io/openai-build-week,BACKEND_PUBLIC_URL=https://biashara-sauti-api-840359086901.us-central1.run.app" \
  --quiet

echo "Cloud Run Gemini and Snippe webhook secrets configured."
