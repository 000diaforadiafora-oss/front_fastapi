# front_fastapi (Planetschool Frontend)

Planetschool Frontend is a Vite + React application that integrates with the FastAPI backend available at [https://countex.space](https://countex.space). It offers an interface to detect colony-forming units (CFUs), manage mock batches and samples, and edit detections in the browser, including polygon-based segmentation tools and webcam capture.

## Features

- **CFU detection** via `/detect/` endpoint with live progress states.
- **Webcam capture** and traditional uploads for images.
- **Interactive annotation editor** supporting rectangle and polygon creation, drag, delete, and class editing.
- **Client-side YOLO export** with bounding boxes or segmentation polygons using `jszip` and `file-saver`.
- **Server ZIP downloads** leveraging the `/detect/download/` endpoint.
- **Mock batch/sample sidebar** to simulate lab workflows.

## Getting started

```bash
npm install
cp .env.example .env # or echo "VITE_API_BASE_URL=https://countex.space" > .env
npm run dev
```

The default environment expects a backend reachable at `https://countex.space`. Adjust the `VITE_API_BASE_URL` variable if you host the backend elsewhere.

## Available scripts

- `npm run dev` – start the Vite development server.
- `npm run build` – type-check and produce a production build.
- `npm run preview` – preview the production build locally.

## Production build

```bash
npm run build
# generated assets are located in dist/
```

Serve the contents of the `dist` directory with any static web server (e.g. Nginx). A hardened example configuration lives in [`deploy/nginx.conf`](deploy/nginx.conf).

## Production deployment checklist

The following steps match the workflow used on the Hetzner host that powers https://countex.space:

```bash
npm ci
npm run build
sudo rm -rf /var/www/front_fastapi
sudo mkdir -p /var/www/front_fastapi
sudo cp -r dist/* /var/www/front_fastapi/
sudo nginx -t && sudo systemctl reload nginx
```

Once the site is in place, request or renew TLS certificates (if needed) and verify the health endpoint:

```bash
sudo certbot --nginx -d countex.space -d www.countex.space
curl -s https://countex.space/health | jq
```

Finally, monitor the services to make sure both the frontend and backend stay healthy:

```bash
sudo systemctl status planetschool
curl -I https://countex.space/detect/
```

### Zero-downtime deploy (optional)

Build the site in a temporary directory and swap the deployment atomically to avoid partial updates:

```bash
npm ci
npm run build
sudo rsync -a --delete dist/ /var/www/front_fastapi_new/
sudo mv /var/www/front_fastapi /var/www/front_fastapi_old || true
sudo mv /var/www/front_fastapi_new /var/www/front_fastapi
sudo nginx -t && sudo systemctl reload nginx
sudo rm -rf /var/www/front_fastapi_old
```

### TLS renewal

Certbot installs a systemd timer by default. Confirm renewal with a dry run and ensure Nginx reloads automatically:

```bash
sudo certbot renew --dry-run
systemctl list-timers | grep certbot
```

If the timer is unavailable, add a cron entry:

```bash
echo '0 3 * * * root certbot renew --quiet --deploy-hook "systemctl reload nginx"' | sudo tee /etc/cron.d/certbot_renew
```

### Nginx considerations

- `deploy/nginx.conf` configures cache lifetimes via a `map` block, injects security headers, and sets `client_max_body_size 25M` for larger uploads.
- The proxy stanza extends `proxy_read_timeout`/`proxy_send_timeout` to 120 s to tolerate slow inference responses.
- When hosting the backend on the same origin, consider exposing it under `/api/` and pointing `VITE_API_BASE_URL` to `/api` to eliminate CORS requirements in production.

### Troubleshooting

Useful commands while diagnosing issues on the server:

```bash
sudo nginx -T                # print the active configuration
journalctl -u nginx -e       # review recent errors
curl -I https://countex.space           # validate the frontend
curl -I https://countex.space/api/health # validate the proxied backend
```
