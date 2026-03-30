# Сборка одного образа: API (Go) + статика фронта (Vue) в frontend-dist для Gin.
# Сборка из корня репозитория: docker build -t requirements-app .

FROM node:22-alpine AS frontend
WORKDIR /src
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
ENV VITE_API_BASE_URL=/api
RUN npm run build

FROM golang:alpine AS backend
WORKDIR /src
ENV GOTOOLCHAIN=auto
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /requirements-app ./cmd/app

FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=backend /requirements-app ./requirements-app
COPY --from=frontend /src/dist ./frontend-dist
ENV TZ=Europe/Moscow
EXPOSE 8080
CMD ["./requirements-app"]
