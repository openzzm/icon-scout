# Website Icon Fetcher Design

## Goal

Build a small web tool that accepts a public website URL, discovers the icons used by that website, recommends the best candidate, and lets the user preview or download any discovered candidate.

The same application must run locally and remain deployable to a public Node.js hosting platform.

## Scope

### Included

- Accept a website URL and automatically add `https://` when the scheme is omitted.
- Fetch and parse the target website from the server.
- Discover icons from:
  - HTML `<link rel="icon">` and related icon declarations
  - Apple touch icon declarations
  - Web App Manifest icon declarations
  - The conventional `/favicon.ico` path
- Resolve relative and protocol-relative icon URLs.
- Remove duplicate candidates.
- Recommend the strongest candidate.
- Show all discovered candidates.
- Preview, copy the source URL, and download each candidate.
- Work on desktop and mobile.
- Reject private-network and local targets.
- Show clear loading, empty, validation, timeout, and upstream error states.

### Excluded From Version 1

- User accounts or saved history
- Batch URL processing
- Image conversion, resizing, or background removal
- Authentication for protected websites
- Crawling pages beyond the initial document and its declared manifest
- Fetching icons from private networks, localhost, or local files

## Architecture

Use a dependency-light Node.js application:

- A Node.js HTTP server serves the static frontend and exposes JSON/download endpoints.
- A static HTML, CSS, and JavaScript frontend provides the interaction.
- Server-side fetching avoids browser CORS restrictions.
- The application uses only Node.js built-in APIs where practical, keeping local setup and deployment simple.

Suggested runtime requirement: Node.js 20 or newer.

## User Experience

### Initial State

The page presents:

- Product title and short explanation
- One prominent URL input
- A primary "获取网站图标" button
- Brief privacy and safety note explaining that only public websites are supported

### Loading State

After submission:

- Disable repeated submission
- Show the normalized target hostname
- Show a clear progress indicator

### Results State

The result area contains:

1. A featured recommended icon with:
   - Large preview
   - Source type
   - Declared or detected dimensions when available
   - File format when available
   - Download button
   - Copy URL button

2. An "全部候选" section containing every unique icon candidate. Each item shows:
   - Preview
   - Source type
   - Dimensions
   - Format
   - Source URL
   - Download and copy actions

Broken preview candidates remain listed only when the server discovered them but could not validate them, with a visible unavailable state.

### Error States

Use concise Chinese messages for:

- Invalid URL
- Unsupported protocol
- Local or private-network target
- DNS resolution failure
- Request timeout
- Target website unavailable
- HTML too large
- No icon discovered
- Manifest unavailable or invalid

## API Design

### `GET /api/icons?url=<website-url>`

Returns the normalized target and discovered icon metadata.

Example response:

```json
{
  "site": {
    "url": "https://example.com/",
    "hostname": "example.com",
    "title": "Example"
  },
  "recommendedId": "icon-1",
  "icons": [
    {
      "id": "icon-1",
      "url": "https://example.com/icon-512.png",
      "source": "manifest",
      "rel": "icon",
      "declaredSizes": ["512x512"],
      "width": 512,
      "height": 512,
      "format": "png",
      "contentType": "image/png",
      "available": true
    }
  ]
}
```

### `GET /api/icon-file?url=<icon-url>&site=<website-url>`

Streams a validated icon as an attachment.

- Both the site and icon URL are validated as public targets.
- The icon URL must belong to the discovered target context.
- Response size is limited.
- The server chooses a safe filename and content type.

### Static Routes

- `GET /` serves the application.
- Static assets are served from a public directory.

## Discovery Logic

1. Normalize the user input.
2. Validate protocol and public-network eligibility.
3. Resolve DNS and reject any private, loopback, link-local, reserved, or unspecified address.
4. Fetch the initial HTML with a timeout, redirect limit, response-size limit, and browser-like user agent.
5. Revalidate every redirect destination before following it.
6. Parse page title and supported icon `<link>` declarations.
7. Parse a declared Web App Manifest, if present.
8. Add `/favicon.ico` as a fallback candidate.
9. Resolve URLs relative to the document or manifest URL.
10. Deduplicate by canonical URL.
11. Probe candidates with bounded requests to collect content type, file size, and dimensions where practical.
12. Rank candidates and return results.

HTML parsing must account for common attribute ordering, quote styles, case differences, and whitespace. It does not need to behave as a complete browser DOM parser.

## Recommendation Ranking

Rank available candidates using these signals:

1. Prefer square icons.
2. Prefer declared or detected sizes near 512x512, then other large sizes.
3. Prefer manifest icons and Apple touch icons when they provide a substantially larger image.
4. Prefer PNG, WebP, SVG, and ICO in that order when quality signals are otherwise equal.
5. Penalize tiny icons and unavailable candidates.

SVG icons may be recommended despite lacking raster dimensions when they are valid and no stronger large raster candidate exists.

## Security

The fetcher is an SSRF-sensitive service. Every outbound request must:

- Allow only `http:` and `https:`.
- Reject URLs containing credentials.
- Reject localhost names and local file paths.
- Resolve DNS before connecting.
- Reject IPv4 and IPv6 addresses in private, loopback, link-local, multicast, reserved, documentation, carrier-grade NAT, or unspecified ranges.
- Revalidate each redirect and manifest/icon request independently.
- Use strict request timeouts.
- Limit redirects.
- Limit HTML, manifest, and icon response sizes.
- Never forward user cookies, authorization headers, or arbitrary headers.
- Return sanitized errors without exposing internal stack traces.

Deployments should additionally apply platform-level rate limiting.

## Visual Direction

Use a restrained dark utility interface:

- Near-black background with subtle cool-toned surfaces
- High-contrast white text and muted secondary labels
- One blue-violet accent for the primary action and recommendation state
- Large, centered input as the primary focus
- A spacious recommended-result panel followed by a compact responsive candidate grid
- Checkerboard or neutral preview surfaces so transparent icons remain visible
- Clear keyboard focus states and reduced-motion support

No raster design assets are required. The interface should be implemented with semantic HTML, CSS, and a small set of code-native SVG icons.

## Project Structure

```text
package.json
server/
  index.js
  fetch.js
  network-safety.js
  icon-discovery.js
  icon-metadata.js
public/
  index.html
  styles.css
  app.js
test/
  network-safety.test.js
  icon-discovery.test.js
README.md
```

## Testing

### Unit Tests

- URL normalization
- Public/private IP classification for IPv4 and IPv6
- Redirect validation
- HTML icon extraction
- Manifest icon extraction
- Relative URL resolution
- Deduplication
- Ranking behavior

### Integration Tests

Use a local mock HTTP server to verify:

- Normal HTML and manifest discovery
- Redirect handling
- Timeouts and size limits
- Invalid manifest behavior
- Download streaming behavior
- Rejection of unsafe targets

### Browser Verification

- Submit a valid URL and inspect recommendation plus candidate list
- Verify copy and download controls
- Verify invalid URL and no-result errors
- Verify desktop and mobile layouts
- Verify loading and disabled states

## Deployment

- Provide `npm start` for local and production use.
- Read `PORT` and host configuration from environment variables.
- Keep no persistent state.
- Include deployment notes for common Node.js hosting platforms.
- Public deployment must sit behind HTTPS and rate limiting.

## Acceptance Criteria

- A user can enter a public website URL and receive a recommended icon plus all discovered candidates.
- Common HTML, Apple touch icon, manifest, and `/favicon.ico` sources are supported.
- The user can preview, copy, and download a candidate.
- Local and private-network targets are rejected before outbound access.
- Redirects and secondary resources are independently validated.
- The interface is usable on desktop and mobile.
- Automated tests cover discovery, ranking, and network-safety behavior.
- The application starts locally with documented commands and can be deployed as a stateless Node.js service.
