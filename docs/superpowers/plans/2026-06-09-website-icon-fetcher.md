# Website Icon Fetcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a stateless Node.js web application that safely discovers, recommends, previews, and downloads icons from public websites.

**Architecture:** A dependency-free Node.js HTTP server owns outbound fetching, SSRF validation, icon discovery, metadata probing, and download streaming. A static HTML/CSS/JavaScript client calls the JSON API and renders the recommended icon plus all candidates.

**Tech Stack:** Node.js 20+ built-in modules, Node test runner, semantic HTML, CSS, browser JavaScript

---

## File Map

- `package.json`: runtime scripts and Node version requirement.
- `server/network-safety.js`: URL normalization, DNS resolution, and public-address enforcement.
- `server/fetch.js`: bounded safe fetches with redirect validation.
- `server/icon-discovery.js`: HTML/manifest extraction, deduplication, and ranking.
- `server/icon-metadata.js`: bounded candidate probing and basic image metadata.
- `server/index.js`: HTTP routing, JSON API, download streaming, and static serving.
- `public/index.html`: semantic application shell.
- `public/styles.css`: responsive dark utility interface.
- `public/app.js`: form submission, results rendering, copy, and download interactions.
- `test/network-safety.test.js`: URL and address safety tests.
- `test/icon-discovery.test.js`: extraction, URL resolution, deduplication, and ranking tests.
- `test/server.test.js`: HTTP API and static route integration tests.
- `README.md`: local use, configuration, security, and deployment notes.

### Task 1: Project Runtime

- [ ] Create `package.json` with `start`, `dev`, and `test` scripts using only Node built-ins.
- [ ] Add an initial test file and run `npm test` to verify the test runner works.

### Task 2: Network Safety

- [ ] Write failing tests for scheme normalization, credential rejection, localhost rejection, IPv4 private/reserved ranges, and IPv6 private/reserved ranges.
- [ ] Run `npm test -- test/network-safety.test.js` and confirm failures are caused by missing behavior.
- [ ] Implement `normalizeSiteUrl`, `isPublicIp`, and `assertPublicUrl`.
- [ ] Run the focused test and then the full suite.

### Task 3: Icon Discovery and Ranking

- [ ] Write failing tests for HTML icon links, manifest links, Apple touch icons, relative URLs, fallback favicon, deduplication, and ranking.
- [ ] Run the focused test and confirm expected failures.
- [ ] Implement attribute parsing, icon extraction, manifest extraction, deduplication, and scoring.
- [ ] Run the focused test and then the full suite.

### Task 4: Bounded Fetch and Metadata

- [ ] Write failing tests for bounded body reads, redirect validation hooks, content-type handling, and simple PNG/GIF/JPEG/ICO/SVG dimension detection.
- [ ] Implement bounded fetch helpers and image metadata detection.
- [ ] Run focused and full tests.

### Task 5: API and Downloads

- [ ] Write integration tests using an injected mock fetcher for successful discovery, invalid URLs, empty results, and downloads.
- [ ] Implement `/api/icons`, `/api/icon-file`, static routes, sanitized errors, and safe filenames.
- [ ] Run focused and full tests.

### Task 6: Frontend

- [ ] Implement the URL form, loading state, error state, recommended result, and candidate grid.
- [ ] Implement copy and download actions with accessible controls.
- [ ] Implement responsive styling, checkerboard preview surfaces, focus states, and reduced-motion handling.

### Task 7: Documentation and Verification

- [ ] Document setup, commands, environment variables, supported discovery sources, deployment notes, and SSRF/rate-limit considerations.
- [ ] Run `npm test`.
- [ ] Run syntax checks over server and client JavaScript.
- [ ] Start the server and verify the core browser workflow at desktop and mobile widths.
- [ ] Verify unsafe targets are rejected and a mocked public target returns recommendation plus candidates.
