function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function attributes(tag) {
  const result = {};
  const pattern = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of tag.matchAll(pattern)) {
    result[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return result;
}

function sizes(value = "") {
  return value.split(/\s+/).filter(Boolean);
}

function formatFromUrl(url) {
  const pathname = new URL(url).pathname;
  return pathname.match(/\.([a-z0-9]+)$/i)?.[1].toLowerCase() ?? "";
}

function candidate({ href, baseUrl, source, rel = "", sizesValue = "", type = "" }) {
  try {
    const url = new URL(href, baseUrl);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    url.hash = "";
    return {
      url: url.href,
      source,
      rel,
      declaredSizes: sizes(sizesValue),
      format: type.split("/")[1]?.split("+")[0] || formatFromUrl(url),
      contentType: type,
      available: true,
    };
  } catch {
    return null;
  }
}

export function discoverHtmlIcons(html, pageUrl) {
  const icons = [];
  let manifestUrl = "";
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    const rel = (attrs.rel ?? "").toLowerCase();
    if (!attrs.href) continue;
    if (rel.split(/\s+/).includes("manifest")) {
      try { manifestUrl = new URL(attrs.href, pageUrl).href; } catch {}
    }
    if (rel.includes("icon")) {
      const icon = candidate({
        href: attrs.href,
        baseUrl: pageUrl,
        source: rel.includes("apple-touch") ? "apple-touch" : "html",
        rel,
        sizesValue: attrs.sizes,
        type: attrs.type,
      });
      if (icon) icons.push(icon);
    }
  }
  const fallback = candidate({ href: "/favicon.ico", baseUrl: pageUrl, source: "fallback", rel: "icon" });
  if (fallback) icons.push(fallback);
  const title = decodeHtml(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() ?? "");
  return { title, manifestUrl, icons };
}

export function discoverManifestIcons(text, manifestUrl) {
  let manifest;
  try {
    manifest = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(manifest.icons)) return [];
  return manifest.icons
    .map((icon) => candidate({
      href: icon?.src,
      baseUrl: manifestUrl,
      source: "manifest",
      rel: icon?.purpose ?? "icon",
      sizesValue: icon?.sizes,
      type: icon?.type,
    }))
    .filter(Boolean);
}

function declaredArea(icon) {
  return Math.max(0, ...icon.declaredSizes.map((size) => {
    const match = size.match(/^(\d+)x(\d+)$/i);
    return match ? Number(match[1]) * Number(match[2]) : 0;
  }));
}

export function iconScore(icon) {
  if (!icon.available) return -100000;
  const area = icon.width && icon.height ? icon.width * icon.height : declaredArea(icon);
  const square = icon.width && icon.height ? icon.width === icon.height : icon.declaredSizes.some((size) => /^(\d+)x\1$/i.test(size));
  const source = { manifest: 500, "apple-touch": 400, html: 300, fallback: 100 }[icon.source] ?? 0;
  const format = { png: 80, webp: 70, svg: 60, ico: 50 }[icon.format] ?? 0;
  return source + format + (square ? 250 : 0) + Math.min(area, 512 * 512) / 100;
}

export function mergeAndRankIcons(items) {
  const unique = new Map();
  for (const item of items) {
    const current = unique.get(item.url);
    if (!current || iconScore(item) > iconScore(current)) unique.set(item.url, item);
  }
  return [...unique.values()].sort((a, b) => iconScore(b) - iconScore(a));
}
