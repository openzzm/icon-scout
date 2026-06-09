import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";

import { convertImage } from "../server/image-conversion.js";

const transparentPng = await sharp({
  create: { width: 2, height: 2, channels: 4, background: { r: 120, g: 80, b: 220, alpha: 0.5 } },
}).png().toBuffer();

function pngIco(png, width = 2, height = 2) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header[6] = width === 256 ? 0 : width;
  header[7] = height === 256 ? 0 : height;
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  return Buffer.concat([header, png]);
}

test("keeps original bytes and content type unchanged", async () => {
  const result = await convertImage(transparentPng, "image/png", "original");
  assert.equal(result.buffer, transparentPng);
  assert.equal(result.contentType, "image/png");
  assert.equal(result.extension, "png");
});

test("converts an image to PNG, JPEG, and WebP", async () => {
  for (const format of ["png", "jpeg", "webp"]) {
    const result = await convertImage(transparentPng, "image/png", format);
    assert.ok(result.buffer.length > 0);
    assert.equal(result.contentType, `image/${format}`);
    assert.equal(result.extension, format === "jpeg" ? "jpg" : format);
  }
});

test("rejects unsupported output formats", async () => {
  await assert.rejects(convertImage(transparentPng, "image/png", "svg"), /不支持的下载格式/);
});

test("converts an ICO containing PNG data to common formats", async () => {
  const ico = pngIco(transparentPng);
  for (const format of ["png", "jpeg", "webp"]) {
    const result = await convertImage(ico, "image/x-icon", format);
    assert.equal(result.contentType, `image/${format}`);
    assert.ok(result.buffer.length > 0);
  }
});
