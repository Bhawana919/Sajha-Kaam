# Sajha Kaam in one container: the API plus the web app it serves, on one address.
# Works on any free host that builds a Dockerfile and sets $PORT (Render, Hugging Face Spaces, Fly...).
# Local test:  docker build -t sajha-kaam . && docker run -p 8080:8080 sajha-kaam

# 1) Build the web app. "same-origin" makes it call the API on whatever address it is served from.
FROM node:22-slim AS web
WORKDIR /mobile
COPY mobile/package.json mobile/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY mobile/ ./
ENV EXPO_PUBLIC_API_URL=same-origin
RUN npx expo export -p web

# 2) The API, serving the web app from /srv/web.
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    DATABASE_URL=sqlite:////tmp/sajha_kaam.db \
    DEMO_MODE=1 LLM_PROVIDER=none WEB_DIR=/srv/web
WORKDIR /srv
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY config config
COPY shared shared
COPY backend/app backend/app
COPY --from=web /mobile/dist /srv/web

WORKDIR /srv/backend
# The database lives in /tmp: a restart brings back fresh demo data, which suits a demo.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --proxy-headers --forwarded-allow-ips='*'"]
