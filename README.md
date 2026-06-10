# Icon Scout

Discover, preview, convert, and download the icons used by any public website.

[Live Demo](https://icon-scout.netlify.app) · [Repository](https://github.com/openzzm/icon-scout)

Icon Scout inspects a website's HTML, Web App Manifest, Apple Touch Icon declarations, and conventional `/favicon.ico` path. It recommends the best available icon while keeping every discovered candidate available for preview and download.

## Features

- Discovers HTML favicon declarations, Apple Touch Icons, Web App Manifest icons, and `/favicon.ico`
- Resolves relative icon and manifest URLs
- Detects common image formats and dimensions
- Recommends the strongest candidate based on source, size, shape, and format
- Previews and downloads every discovered candidate
- Downloads the original asset or converts it to PNG, JPEG, or WebP
- Decodes multi-layer ICO files and converts their highest-resolution image
- Preserves transparency for PNG and WebP; JPEG uses a white background
- Supports responsive desktop and mobile layouts
- Runs as a standalone Node.js service or on Netlify Functions
- Rejects local, private, link-local, multicast, reserved, and other unsafe network targets

## Quick Start

### Requirements

- Node.js 20 or newer
- npm

### Install and Run

```bash
git clone https://github.com/openzzm/icon-scout.git
cd icon-scout
npm install
npm start
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

To use a different host or port:

```bash
HOST=0.0.0.0 PORT=8080 npm start
```

On Windows PowerShell:

```powershell
$env:HOST = "0.0.0.0"
$env:PORT = "8080"
npm start
```

## Development

```bash
npm run dev       # Start the standalone Node.js server with watch mode
npm run netlify:dev
npm test          # Run the Node.js test suite
npm run check     # Check JavaScript syntax
```

## Architecture

```text
public/                 Static frontend and brand assets
server/                 Discovery, fetching, safety, conversion, and Node server
netlify/functions/      Netlify Functions adapter
test/                   Unit and integration tests
netlify.toml            Netlify build, function, and header configuration
```

The browser communicates only with the local API. All third-party website requests, icon inspection, and image conversions happen on the server.

### Discovery Flow

1. Normalize and validate the submitted URL.
2. Resolve DNS and reject unsafe network addresses.
3. Fetch the page with redirect, timeout, and response-size limits.
4. Parse icon declarations and the Web App Manifest.
5. Add `/favicon.ico` as a fallback candidate.
6. Probe candidates for availability, dimensions, and content type.
7. Rank and return all candidates with a recommended icon.

## API

### Discover Website Icons

```http
GET /api/icons?url=https://example.com
```

Example response:

```json
{
  "site": {
    "url": "https://example.com/",
    "hostname": "example.com",
    "title": "Example Domain"
  },
  "recommendedId": "icon-1",
  "icons": [
    {
      "id": "icon-1",
      "url": "https://example.com/favicon.ico",
      "source": "fallback",
      "width": 32,
      "height": 32,
      "format": "ico",
      "available": true
    }
  ]
}
```

### Preview or Download an Icon

```http
GET /api/icon-file?url=https://example.com/favicon.ico
GET /api/icon-file?url=https://example.com/favicon.ico&download=1
GET /api/icon-file?url=https://example.com/favicon.ico&download=1&format=webp
```

Supported conversion formats:

- `png`
- `jpeg`
- `webp`

Omit `format` to preserve the original file.

## Security

Icon Scout performs outbound requests and must be treated as an SSRF-sensitive service.

The application:

- Allows only HTTP and HTTPS URLs
- Rejects credentials embedded in URLs
- Resolves and validates target addresses before requests
- Rejects private, loopback, link-local, multicast, reserved, documentation, and carrier-grade NAT ranges
- Revalidates redirects and secondary resources
- Limits request duration, redirect count, response size, and image input size
- Does not forward user cookies, authorization headers, or arbitrary request headers

For public deployments, also configure platform-level rate limiting and restrict outbound network access where possible.

## Deploy to Netlify

The repository includes a Netlify Functions adapter and a ready-to-use `netlify.toml`.

```bash
npx netlify login
npx netlify dev
npx netlify deploy
npx netlify deploy --prod
```

Netlify publishes the static frontend from `public/` and serves `/api/icons` and `/api/icon-file` through the function in `netlify/functions/api.mjs`.

## Deploy as a Node.js Service

Run the stateless server on any platform that supports a persistent Node.js process:

```bash
HOST=0.0.0.0 PORT=3000 npm start
```

Production deployments should use HTTPS, rate limiting, a supported Node.js release, and restricted outbound network permissions.

## Testing

```bash
npm test
npm run check
```

The test suite covers URL normalization, SSRF protections, icon discovery, manifest parsing, candidate ranking, image metadata, ICO decoding, format conversion, the standalone API, and the Netlify Functions adapter.
