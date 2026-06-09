import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { safeFetch } from "./fetch.js";
import { detectImageMetadata } from "./icon-metadata.js";
import { discoverHtmlIcons, discoverManifestIcons, mergeAndRankIcons } from "./icon-discovery.js";
import { convertImage, convertedFilename } from "./image-conversion.js";
import { assertPublicUrl, normalizeSiteUrl, PublicUrlError } from "./network-safety.js";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const publicDir = path.join(root, "public");
const staticTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

function json(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

async function inspectIcon(icon, fetcher) {
  try {
    const result = await fetcher(new URL(icon.url), { maxBytes: 5 * 1024 * 1024, timeoutMs: 6000 });
    if (!result.contentType.startsWith("image/") && !result.contentType.includes("icon")) throw new Error("not image");
    return { ...icon, ...detectImageMetadata(result.buffer, result.contentType), contentType: result.contentType, bytes: result.buffer.length, available: true };
  } catch {
    return { ...icon, available: false };
  }
}

export async function findSiteIcons(input, options = {}) {
  const assertUrl = options.assertUrl ?? assertPublicUrl;
  const fetcher = options.fetcher ?? ((url, fetchOptions = {}) => safeFetch(url, { assertUrl, ...fetchOptions }));
  const requested = normalizeSiteUrl(input);
  await assertUrl(requested);
  const page = await fetcher(requested, { maxBytes: 2 * 1024 * 1024, timeoutMs: 9000 });
  const html = page.buffer.toString("utf8");
  const discovered = discoverHtmlIcons(html, page.url);
  let manifestIcons = [];
  if (discovered.manifestUrl) {
    try {
      const manifest = await fetcher(new URL(discovered.manifestUrl), { maxBytes: 512 * 1024, timeoutMs: 6000 });
      manifestIcons = discoverManifestIcons(manifest.buffer.toString("utf8"), manifest.url);
    } catch {}
  }
  const initial = mergeAndRankIcons([...discovered.icons, ...manifestIcons]).slice(0, 24);
  const inspected = await Promise.all(initial.map((icon) => inspectIcon(icon, fetcher)));
  const icons = mergeAndRankIcons(inspected).map((icon, index) => ({ id: `icon-${index + 1}`, ...icon }));
  if (!icons.some((icon) => icon.available)) throw new PublicUrlError("没有发现可用的网站图标", 404);
  return {
    site: { url: page.url.href, hostname: page.url.hostname, title: discovered.title || page.url.hostname },
    recommendedId: icons.find((icon) => icon.available)?.id ?? icons[0]?.id ?? null,
    icons,
  };
}

async function serveStatic(reqUrl, res) {
  const pathname = reqUrl.pathname === "/" ? "/index.html" : reqUrl.pathname;
  const resolved = path.resolve(publicDir, `.${pathname}`);
  if (!resolved.startsWith(publicDir)) return false;
  try {
    const content = await fs.readFile(resolved);
    res.writeHead(200, { "content-type": staticTypes[path.extname(resolved)] ?? "application/octet-stream", "cache-control": "no-cache" });
    res.end(content);
    return true;
  } catch {
    return false;
  }
}

export function createAppServer(options = {}) {
  const assertUrl = options.assertUrl ?? assertPublicUrl;
  const fetcher = options.fetcher ?? ((url, fetchOptions = {}) => safeFetch(url, { assertUrl, ...fetchOptions }));
  return http.createServer(async (req, res) => {
    const reqUrl = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
    try {
      if (req.method === "GET" && reqUrl.pathname === "/api/icons") {
        return json(res, 200, await findSiteIcons(reqUrl.searchParams.get("url"), { assertUrl, fetcher }));
      }
      if (req.method === "GET" && reqUrl.pathname === "/api/icon-file") {
        const iconUrl = normalizeSiteUrl(reqUrl.searchParams.get("url"));
        await assertUrl(iconUrl);
        const icon = await fetcher(iconUrl, { maxBytes: 8 * 1024 * 1024, timeoutMs: 9000 });
        if (!icon.contentType.startsWith("image/") && !icon.contentType.includes("icon")) throw new PublicUrlError("目标资源不是图标", 415);
        const output = await convertImage(icon.buffer, icon.contentType, reqUrl.searchParams.get("format") ?? "original");
        const disposition = reqUrl.searchParams.get("download") === "1" ? "attachment" : "inline";
        res.writeHead(200, {
          "content-type": output.contentType || "application/octet-stream",
          "content-length": output.buffer.length,
          "content-disposition": `${disposition}; filename="${convertedFilename(icon.url, output.extension)}"`,
          "cache-control": "public, max-age=3600",
          "x-content-type-options": "nosniff",
        });
        return res.end(output.buffer);
      }
      if (req.method === "GET" && await serveStatic(reqUrl, res)) return;
      json(res, 404, { error: "页面不存在" });
    } catch (error) {
      const status = error instanceof PublicUrlError ? error.status : 502;
      json(res, status, { error: error instanceof PublicUrlError ? error.message : "获取网站图标失败" });
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? "127.0.0.1";
  createAppServer().listen(port, host, () => console.log(`Icon Scout: http://${host}:${port}`));
}
