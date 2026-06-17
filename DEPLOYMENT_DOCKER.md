# Docker Deployment

This deployment serves the Vite build through Nginx and proxies backend calls
through the same frontend origin.

Production browser flow:

```text
Browser
-> http://192.168.100.99/
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
  `8080` inside the container, published on host port `80`.
- `local-printer-api`: existing `local-printer-api:latest` image, reachable only
  inside Compose as `http://local-printer-api:8000`, with SQLite persisted in
  the `printer-backend-db` volume.

Expected frontend URLs:

```text
http://192.168.100.99/
http://ubuntu26-remote.local/
```

## Move Snap Nextcloud Off Port 80

If the server already has the Nextcloud snap listening on port `80`, move it
before starting this stack. Use `8081` for HTTP unless it is occupied:

```bash
scripts/move-nextcloud-off-80.sh
```

If HTTPS is also enabled and needs to move away from `443`, use a matching
non-standard port:

```bash
NEXTCLOUD_HTTPS_PORT=8443 scripts/move-nextcloud-off-80.sh
```

The helper checks whether the target HTTP port is already listening before it
changes the snap configuration. To choose a different HTTP port:

```bash
NEXTCLOUD_HTTP_PORT=8082 scripts/move-nextcloud-off-80.sh
```

Rollback:

```bash
docker compose down
scripts/move-nextcloud-off-80.sh --rollback
```

Then return this app to a non-privileged host port if needed:

```yaml
ports:
  - "8080:8080"
```

Restart the stack after changing the port mapping:

```bash
docker compose up -d --build
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

curl -i http://localhost/
curl -i http://localhost/api/health
curl -i http://localhost/api/status

curl -c cookies.txt -s -X POST http://localhost/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"correct horse battery staple"}'

curl -b cookies.txt -i "http://localhost/api/jobs?scope=active"
curl -b cookies.txt -i "http://localhost/api/jobs?scope=completed"
curl -b cookies.txt -i "http://localhost/api/jobs?scope=all"
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
curl -i http://192.168.100.99/
curl -i http://192.168.100.99/api/health
curl -i http://192.168.100.99/api/status
```

Open the frontend at:

```text
http://192.168.100.99/
```

or, when mDNS is available:

```text
http://ubuntu26-remote.local/
```

The browser should make API calls to the frontend origin under `/api`. It should
not call `http://local-printer-api:8000` directly and should not need production
CORS access to the backend.
