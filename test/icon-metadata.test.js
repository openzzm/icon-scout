import test from "node:test";
import assert from "node:assert/strict";

import { detectImageMetadata } from "../server/icon-metadata.js";

test("detects PNG dimensions and format", () => {
  const bytes = Buffer.alloc(24);
  bytes.write("\x89PNG\r\n\x1a\n", 0, "binary");
  bytes.writeUInt32BE(512, 16);
  bytes.writeUInt32BE(256, 20);
  assert.deepEqual(detectImageMetadata(bytes, "image/png"), { width: 512, height: 256, format: "png" });
});

test("detects SVG dimensions", () => {
  const bytes = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32"></svg>');
  assert.deepEqual(detectImageMetadata(bytes, "image/svg+xml"), { width: 64, height: 32, format: "svg" });
});

test("detects ICO dimensions where zero means 256", () => {
  const bytes = Buffer.from([0, 0, 1, 0, 1, 0, 0, 0, 0, 0]);
  assert.deepEqual(detectImageMetadata(bytes, "image/x-icon"), { width: 256, height: 256, format: "ico" });
});
