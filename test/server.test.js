import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import sharp from "sharp";

import { createAppServer, findSiteIcons } from "../server/index.js";

async function withServer(options, run) {
  const server = createAppServer(options);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

test("GET /api/icons returns recommended and all candidates", async () => {
  const fetcher = async (url) => {
    if (url.href.endsWith("app.webmanifest")) {
      return { url, status: 200, contentType: "application/manifest+json", buffer: Buffer.from('{"icons":[{"src":"/big.png","sizes":"512x512","type":"image/png"}]}') };
    }
    if (url.href.endsWith(".png") || url.href.endsWith(".ico")) {
      const buffer = Buffer.alloc(24);
      buffer.write("\x89PNG\r\n\x1a\n", 0, "binary");
      buffer.writeUInt32BE(url.href.endsWith("big.png") ? 512 : 32, 16);
      buffer.writeUInt32BE(url.href.endsWith("big.png") ? 512 : 32, 20);
      return { url, status: 200, contentType: "image/png", buffer };
    }
    return {
      url,
      status: 200,
      contentType: "text/html",
      buffer: Buffer.from('<title>Demo</title><link rel="icon" href="/small.png"><link rel="manifest" href="/app.webmanifest">'),
    };
  };
  await withServer({ fetcher, assertUrl: async (url) => url }, async (base) => {
    const response = await fetch(`${base}/api/icons?url=https://example.com`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.site.title, "Demo");
    assert.equal(body.icons[0].width, 512);
    assert.equal(body.recommendedId, body.icons[0].id);
  });
});

test("GET /api/icons reports invalid input", async () => {
  await withServer({}, async (base) => {
    const response = await fetch(`${base}/api/icons?url=file:///test`);
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /HTTP/);
  });
});

test("findSiteIcons reports when every discovered icon is unavailable", async () => {
  const fetcher = async (url) => {
    if (url.href.endsWith(".ico")) throw new Error("missing");
    return { url, status: 200, contentType: "text/html", buffer: Buffer.from("<title>Empty</title>") };
  };
  await assert.rejects(
    findSiteIcons("https://example.com", { fetcher, assertUrl: async (url) => url }),
    /没有发现可用的网站图标/,
  );
});

test("GET /api/icon-file returns the selected converted format", async () => {
  const png = await sharp({
    create: { width: 2, height: 2, channels: 4, background: { r: 120, g: 80, b: 220, alpha: 0.5 } },
  }).png().toBuffer();
  const fetcher = async (url) => ({ url, status: 200, contentType: "image/png", buffer: png });
  await withServer({ fetcher, assertUrl: async (url) => url }, async (base) => {
    const response = await fetch(`${base}/api/icon-file?url=https://example.com/icon.png&download=1&format=webp`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/webp");
    assert.match(response.headers.get("content-disposition"), /website-icon\.webp|icon\.webp/);
    assert.ok((await response.arrayBuffer()).byteLength > 0);
  });
});

test("GET /api/icon-file rejects unsupported converted formats", async () => {
  const fetcher = async (url) => ({ url, status: 200, contentType: "image/png", buffer: Buffer.from("image") });
  await withServer({ fetcher, assertUrl: async (url) => url }, async (base) => {
    const response = await fetch(`${base}/api/icon-file?url=https://example.com/icon.png&format=svg`);
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /不支持的下载格式/);
  });
});
