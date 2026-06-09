import path from "node:path";
import { decodeIco, isIco } from "icojs";
import sharp from "sharp";

import { PublicUrlError } from "./network-safety.js";

const formats = {
  png: { contentType: "image/png", extension: "png" },
  jpeg: { contentType: "image/jpeg", extension: "jpg" },
  webp: { contentType: "image/webp", extension: "webp" },
};

function extensionFromContentType(contentType) {
  return contentType
    .split("/")[1]
    ?.replace("svg+xml", "svg")
    .replace("x-icon", "ico")
    .replace("vnd.microsoft.icon", "ico")
    .replace("jpeg", "jpg") || "bin";
}

export async function convertImage(buffer, contentType, requestedFormat = "original") {
  const format = String(requestedFormat || "original").toLowerCase();
  if (format === "original") {
    return { buffer, contentType, extension: extensionFromContentType(contentType) };
  }
  if (!formats[format]) throw new PublicUrlError("不支持的下载格式", 400);

  try {
    let input = buffer;
    if (isIco(buffer)) {
      const layers = await decodeIco(buffer, "image/png");
      const largest = layers.sort((a, b) => (b.width * b.height) - (a.width * a.height) || b.bpp - a.bpp)[0];
      if (!largest) throw new Error("empty ICO");
      input = Buffer.from(largest.buffer);
    }
    let pipeline = sharp(input, { animated: true, limitInputPixels: 64 * 1024 * 1024 });
    if (format === "png") pipeline = pipeline.png();
    if (format === "webp") pipeline = pipeline.webp({ quality: 90 });
    if (format === "jpeg") pipeline = pipeline.flatten({ background: "#ffffff" }).jpeg({ quality: 92 });
    return { buffer: await pipeline.toBuffer(), ...formats[format] };
  } catch {
    throw new PublicUrlError("无法转换该图标格式", 422);
  }
}

export function convertedFilename(url, extension) {
  const base = path.basename(url.pathname, path.extname(url.pathname)).replace(/[^\w.-]+/g, "-") || "website-icon";
  return `${base}.${extension}`;
}
