# Docker Deployment

This deployment serves the Vite build through Nginx and proxies backend calls
through the same frontend origin.

Production browser flow:

```text
Browser
-> http://192.168.100.99:8080
-> Print Bar Nginx container
-> /api/*
-> http://local-printer-api:8000 inside the Docker network
```

The browser must not call Docker service DNS names such as
`http://local-printer-api:8000`. Docker Compose service names only resolve from
containers on the same Docker network, not from LAN browsers.

## Build the Frontend Image

```bash
docker build \
  --build-arg VITE_PRINTER_API_BASE_URL=/api \
  -t print-bar-app:latest .
```

The production bundle uses `/api` as its API base URL. Nginx then proxies
`/api/health` to `http://local-printer-api:8000/health`, `/api/files` to
`http://local-printer-api:8000/files`, and so on. This keeps backend URLs out of
the frontend bundle and avoids browser CORS in the Docker deployment.

## Run the Combined Stack

The default Compose file runs the frontend and consumes the existing backend
image:

```bash
docker compose up -d --build
```

Services:

- `print-bar-app`: unprivileged Nginx serving the static React build on port
  `8080`.
- `local-printer-api`: existing `local-printer-api:latest` image, reachable only
  inside Compose as `http://local-printer-api:8000`.

Expected frontend URLs:

```text
http://192.168.100.99:8080
http://ubuntu26-remote.local:8080
```

## Run Only the Frontend Container

Use this mode only when the frontend container is attached to a Docker network
where a backend container is already reachable as `local-printer-api`.

```bash
docker run -d \
  --name print-bar-app \
  --network <backend-network> \
  -p 8080:8080 \
  --restart unless-stopped \
  print-bar-app:latest
```

Do not proxy to a backend container IP. Container IPs are not stable. Prefer a
shared Docker network and a stable DNS name such as `local-printer-api`.

## Separate Backend Compose Stack

If `local_printer_api` is already managed by another Compose stack, attach both
stacks to the same external network and keep the backend service alias stable:

```yaml
networks:
  printer-net:
    external: true
```

Then attach `print-bar-app` to `printer-net` and keep the Nginx upstream as:

```text
http://local-printer-api:8000
```

Only use a host LAN IP as a last resort. The reliable production pattern is
container-to-container service discovery through Docker DNS.

## Verify on the Ubuntu Server

```bash
docker compose config
docker compose up -d --build

curl -i http://localhost:8080/
curl -i http://localhost:8080/api/health
curl -i http://localhost:8080/api/status
curl -i "http://localhost:8080/api/jobs?scope=active"
curl -i "http://localhost:8080/api/jobs?scope=completed"
curl -i "http://localhost:8080/api/jobs?scope=all"
```

Upload, preview, print, cancel, and forget job endpoints are proxied through the
same `/api` prefix:

```text
POST   /api/files
GET    /api/files/{file_id}/preview
GET    /api/files/{file_id}/preview/{page}
POST   /api/print
GET    /api/jobs/{job_id}
DELETE /api/jobs/{job_id}
POST   /api/jobs/{job_id}/forget
```

Nginx preserves query strings, so job scopes such as
`/api/jobs?scope=active` are passed through unchanged.

## Verify from Another LAN Machine

```bash
curl -i http://192.168.100.99:8080/
curl -i http://192.168.100.99:8080/api/health
curl -i http://192.168.100.99:8080/api/status
curl -i "http://192.168.100.99:8080/api/jobs?scope=active"
```

Open the frontend at:

```text
http://192.168.100.99:8080
```

or, when mDNS is available:

```text
http://ubuntu26-remote.local:8080
```

The browser should make API calls to the frontend origin under `/api`. It should
not call `http://local-printer-api:8000` directly and should not need production
CORS access to the backend.
