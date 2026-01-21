FROM node:18-slim AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including deno for yt-dlp YouTube signature extraction
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    unzip \
    && curl -fsSL https://deno.land/install.sh | sh \
    && rm -rf /var/lib/apt/lists/*

# Add deno to PATH
ENV DENO_INSTALL="/root/.deno"
ENV PATH="$DENO_INSTALL/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY config/ ./config/

COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 10000

CMD ["python", "backend/main.py"]
