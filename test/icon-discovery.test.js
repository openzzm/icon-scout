import test from "node:test";
import assert from "node:assert/strict";

import {
  discoverHtmlIcons,
  discoverManifestIcons,
  mergeAndRankIcons,
} from "../server/icon-discovery.js";

test("discovers HTML icons and resolves relative URLs", () => {
  const html = `
    <title>Demo Site</title>
    <link sizes="32x32" href="/favicon-32.png" rel="icon">
    <link rel='apple-touch-icon' href='./apple.png' sizes='180x180'>
    <link rel="manifest" href="/app.webmanifest">
  `;
  const result = discoverHtmlIcons(html, new URL("https://example.com/docs/page"));

  assert.equal(result.title, "Demo Site");
  assert.equal(result.manifestUrl, "https://example.com/app.webmanifest");
  assert.deepEqual(result.icons.map((icon) => icon.url), [
    "https://example.com/favicon-32.png",
    "https://example.com/docs/apple.png",
    "https://example.com/favicon.ico",
  ]);
});

test("discovers manifest icons relative to the manifest", () => {
  const icons = discoverManifestIcons(
    JSON.stringify({ icons: [{ src: "icons/512.png", sizes: "512x512", type: "image/png" }] }),
    new URL("https://example.com/assets/app.webmanifest"),
  );
  assert.equal(icons[0].url, "https://example.com/assets/icons/512.png");
  assert.equal(icons[0].source, "manifest");
});

test("deduplicates and recommends the strongest icon", () => {
  const icons = mergeAndRankIcons([
    { url: "https://example.com/a.png", source: "html", declaredSizes: ["32x32"], format: "png", available: true },
    { url: "https://example.com/a.png", source: "fallback", declaredSizes: [], format: "png", available: true },
    { url: "https://example.com/b.png", source: "manifest", declaredSizes: ["512x512"], format: "png", available: true },
  ]);
  assert.equal(icons.length, 2);
  assert.equal(icons[0].url, "https://example.com/b.png");
});
