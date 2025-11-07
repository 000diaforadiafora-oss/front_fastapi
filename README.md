# Planetschool Frontend

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

Serve the contents of the `dist` directory with any static web server (e.g. Nginx). A sample Nginx configuration is available in the user prompt.
