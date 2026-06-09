import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";

import { handleApiRequest } from "../netlify/functions/api.mjs";

test("Netlify function returns icon discovery JSON", async () => {
  const png = await pngBuffer();
  const fetcher = async (url) => {
    if (url.href.endsWith(".ico")) {
      return { url, status: 200, contentType: "image/png", buffer: png };
    }
    return { url, status: 200, contentType: "text/html", buffer: Buffer.from("<title>Netlify Demo</title>") };
  };
  const response = await handleApiRequest(
    new Request("https://icon-scout.netlify.app/api/icons?url=https://example.com"),
    { fetcher, assertUrl: async (url) => url },
  );
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.site.title, "Netlify Demo");
  assert.equal(body.icons.length, 1);
});

test("Netlify function returns converted image bytes", async () => {
  const png = await pngBuffer();
  const fetcher = async (url) => ({ url, status: 200, contentType: "image/png", buffer: png });
  const response = await handleApiRequest(
    new Request("https://icon-scout.netlify.app/api/icon-file?url=https://example.com/icon.png&format=webp&download=1"),
    { fetcher, assertUrl: async (url) => url },
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/webp");
  assert.match(response.headers.get("content-disposition"), /icon\.webp/);
  assert.ok((await response.arrayBuffer()).byteLength > 0);
});

async function pngBuffer() {
  return sharp({
    create: { width: 32, height: 32, channels: 4, background: { r: 80, g: 60, b: 220, alpha: 1 } },
  }).png().toBuffer();
}
